/**
 * Reliable transfer for Chrome Canary DataChannel impl.
 * Author: @michellebu
 */
function Reliable(dc) {
  if (!(this instanceof Reliable)) return new Reliable(dc);
  this._dc = dc;

  // Messages sent/received so far.
  // id: { (ack: n|n: index), chunks: [...] }
  this._outgoing = {};
  this._incoming = {};

  // Window size.
  this._window = 5;
  // MTU.
  this._mtu = 1000;

  // Messages sent.
  this._count = 0;

  this._setupDC();
};

// Send a message reliably.
Reliable.prototype.send = function(msg) {
  // Determine if chunking is necessary.

  // Generate an ID for this particular message.
  this._outgoing[this._count] = {
    ack: 0,
    n: 0,
    chunks: []
  };
  this._count += 1;
  // TODO: generate chunks.

  // Send prelim window.
  this._sendWindowedChunks(id);
};

// Overwritten, typically.
Reliable.prototype.onmessage = function(msg) {};

// Set up DataChannel handlers.
Reliable.prototype.setupDC = function() {
  // Handle various message types.
  var self = this;
  this._dc.onmessage = function(msg) {
    // TODO: binarypack unpack shits.

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
          self._ack(id, 1);
          self.onmessage(message);
        }
        break;
      // Reached the end of the message.
      case 'end':
        // What if 'end' is sent out of order? Eventually we will ACK for
        // and receive it, so shouldn't be a problem.
        data = idata;
        if (!!data) {
          self._complete(id);
          data.ack += 1;
          self._ack(id, data.ack);
          // TODO: delete from dict.
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
          data.chunks[data.n].sent = false;
          self._sendWindowedChunks(id);

          // Clean up when all chunks are ACKed.
          if (data.ack >= data.chunks.length) {
            delete self._outgoing[id];
          }
        }
        // If !data, just ignore.
        break;
      // Received a chunk of data.
      case 'chunk':
        // Create a new entry if none exists.
        data = idata;
        if (!data) {
          data = {
            ack: 0,
            chunks: []
          };
          self._incoming[id] = data;
        }

        // Make sure this message is supposed to be incoming.
        if (data.n === undefined) {
          break;
        }

        var n = chunk[2];
        var chunk = chunk[3];
        data[chunks].push(chunk);

        // If we get the chunk we're looking for, ACK for next missing.
        // Otherwise, ACK the same N again.
        if (n === data.ack) {
          self._calculateNextAck(id);
        }
        self._ack(id, data.ack);
        break;
      default:
        // Shouldn't happen, but would make sense for message to just go
        // through as is.
        self.send(msg);
        break;
    }
  };
};

// Chunks BL into smaller messages.
Reliable.prototype._chunk = function(bl) {
  // TODO: blooooob.
  
  return [];
};

// Sends ACK N, expecting Nth blob chunk for message ID.
Reliable.prototype._ack = function(id, n) {
  this._dc.send(['ack', id, n]);
};

// Sends END.
Reliable.prototype._end = function(id, n) {
  this._dc.send(['end', id, n]);
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
  var data = this._outgoing[id];
  var ch = data.chunks;
  var limit = Math.min(data.ack + this._window, ch.length);
  for (var i = data.n; i < limit; i += 1) {
    if (!ch[i].sent) {
      ch[i].sent = true;
      // TODO: set timer.
      this._sendChunk(id, i, chunk.payload);
    }
  }
  if (data.ack + this._window >= ch.length) {
    this._end(id, ch.length);
  }
  // TODO: set retry timer.
};

// Sends one chunk.
Reliable.prototype._sendChunk = function(id, n, payload) {
  this._dc.send(['chunk', id, n, payload]);
};

// Puts together a message from chunks.
Reliable.prototype._complete = function(id) {
  // TODO: fancy bloob stuff.
  this.onmessage(complete);
};
