/**
 * Reliable transfer for Chrome Canary DataChannel impl.
 * Author: @michellebu
 */
function Reliable(dc) {
  if (!(this instanceof Reliable)) return new Reliable(dc);
  this._dc = dc;

  // FIXME: make this an option.
  util.debug = true;

  // Messages sent/received so far.
  // id: { (ack: n|n: index), chunks: [...] }
  this._outgoing = {};
  this._incoming = {};
  this._received = {};

  // Window size.
  this._window = 5;
  // MTU.
  this._mtu = 800;
  // Interval for setTimeout. In ms.
  this._interval = 100;

  // Messages sent.
  this._count = 0;

  // Outgoing message queue.
  this._queue = [];

  this._setupDC();
};

// Send a message reliably.
Reliable.prototype.send = function(msg) {
  // Determine if chunking is necessary.
  var bl = util.pack(msg);
  if (bl.size < this._mtu) {
    this._handleSend(['no', bl]);
    return;
  }

  this._outgoing[this._count] = {
    ack: 0,
    n: 0,
    chunks: this._chunk(bl)
  };

  // Send prelim window.
  this._sendWindowedChunks(this._count);
  this._count += 1;
};

// Overwritten, typically.
Reliable.prototype.onmessage = function(msg) {};

// Set up interval for processing queue.
Reliable.prototype._setupInterval = function() {
  var self = this;
  this._timeout = setInterval(function() {
    var message = self._queue.shift();
    console.log('Sending...', message);
    self._dc.send(message);
    if (self._queue.length === 0) {
      clearTimeout(self._timeout);
      self._timeout = null;
    }
  }, this._interval);
};

// Handle sending a message.
// FIXME: Don't wait for interval time for all messages...
Reliable.prototype._handleSend = function(msg) {
  // FIXME: String stuff...
  var self = this;
  msg = util.pack(msg);
  util.blobToBinaryString(msg, function(str) {
    self._queue.push(str);
    if (!self._timeout) {
      self._setupInterval();
    }
  });
};

// Set up DataChannel handlers.
Reliable.prototype._setupDC = function() {
  // Handle various message types.
  var self = this;
  this._dc.onmessage = function(e) {
    var msg = e.data;
    var datatype = msg.constructor;
    // FIXME: msg is String until binary is supported.
    // Once that happens, this will have to be smarter.
    if (datatype === String) {
      var ab = util.binaryStringToArrayBuffer(msg);
      msg = util.unpack(ab);
      self._handleMessage(msg);
    }
  };
};

// Handles an incoming message.
Reliable.prototype._handleMessage = function(msg) {
  util.log('handleMessage: ', msg);
  var id = msg[1];
  var idata = this._incoming[id];
  var odata = this._outgoing[id];
  var data;
  switch (msg[0]) {
    // No chunking was done.
    case 'no':
      var message = id;
      if (!!message) {
        // TODO: What fancy timeout stuff to do with ACK?
        this.onmessage(util.unpack(message));
      }
      break;
    // Reached the end of the message.
    case 'end':
      // What if 'end' is sent out of order? Eventually we will ACK for
      // and receive it, so shouldn't be a problem.
      data = idata;
      if (!!data && data.ack === msg[2]) {
        this._complete(id);
        data.ack += 1;
        this._ack(id, data.ack);
        this._received[id] = true;
      }
      break;
    case 'ack':
      data = odata;
      if (!!data) {
        // TODO: more optimization for window size & data sent.
        var ack = msg[2];
        // Take the larger ACK, for out of order messages.
        data.ack = Math.max(ack, data.ack);
        data.n = data.ack;
        this._sendWindowedChunks(id);

        // Clean up when all chunks are ACKed.
        if (data.ack >= data.chunks.length) {
          delete this._outgoing[id];
        }
      }
      // If !data, just ignore.
      break;
    // Received a chunk of data.
    case 'chunk':
      // Create a new entry if none exists.
      data = idata;
      if (!data) {
        if (this._received[id] !== undefined) {
          break;
        }
        data = {
          ack: 0,
          chunks: []
        };
        this._incoming[id] = data;
      }

      var n = msg[2];
      var chunk = msg[3];
      data.chunks[n] = chunk;

      // If we get the chunk we're looking for, ACK for next missing.
      // Otherwise, ACK the same N again.
      if (n === data.ack) {
        this._calculateNextAck(id);
      }
      this._ack(id, data.ack);
      break;
    default:
      // Shouldn't happen, but would make sense for message to just go
      // through as is.
      this._handleSend(msg);
      break;
  }
};

// Chunks BL into smaller messages.
Reliable.prototype._chunk = function(bl) {
  // FIXME: large as possible chunking.
  var chunks = [];
  var size = bl.size;
  var start = 0;
  while (start < size) {
    var end = Math.min(size, start + this._mtu);
    var b = bl.slice(start, end);
    var chunk = {
      payload: b
    }
    chunks.push(chunk);
    start = end;
  }
  return chunks;
};

// Sends ACK N, expecting Nth blob chunk for message ID.
Reliable.prototype._ack = function(id, n) {
  this._handleSend(['ack', id, n]);
};

// Sends END.
Reliable.prototype._end = function(id, n) {
  this._handleSend(['end', id, n]);
};

// Calculates the next ACK number, given chunks.
Reliable.prototype._calculateNextAck = function(id) {
  var data = this._incoming[id];
  var chunks = data.chunks;
  for (var i = 0, ii = chunks.length; i < ii; i += 1) {
    // This chunk is missing!!! Better ACK for it.
    if (chunks[i] === undefined) {
      data.ack = i;
      return;
    }
  }
  data.ack = chunks.length;
};

// Sends the next window of chunks.
Reliable.prototype._sendWindowedChunks = function(id) {
  util.log('sendWindowedChunks for: ', id);
  var data = this._outgoing[id];
  var ch = data.chunks;
  var limit = Math.min(data.ack + this._window, ch.length);
  var timeout = 0;
  for (var i = data.n; i < limit; i += 1) {
    if (!ch[i].sent || i === data.n) {
      ch[i].sent = true;
      // TODO: set timer.
      this._sendChunk(id, i, ch[i].payload);
    }
  }
  if (data.ack + this._window >= ch.length) {
    this._end(id, ch.length);
  }
  // TODO: set retry timer.
};

// Sends one chunk.
Reliable.prototype._sendChunk = function(id, n, payload) {
  util.log('sendChunk', payload);
  this._handleSend(['chunk', id, n, payload]);
};

// Puts together a message from chunks.
Reliable.prototype._complete = function(id) {
  util.log('complete', id);
  // FIXME: handle errors.
  var self = this;
  var chunks = this._incoming[id].chunks;
  var bl = new Blob(chunks);
  util.blobToArrayBuffer(bl, function(ab) {
    self.onmessage(util.unpack(ab));
  });
  delete this._incoming[id];
};

exports.Reliable = Reliable;
