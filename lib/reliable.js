/**
 * Reliable transfer for Chrome Canary DataChannel impl.
 * Author: @michellebu
 */
function Reliable(dc) {
  if (!(this instanceof Reliable)) return new Reliable(dc);
  this._dc = dc;

  // Messages received so far.
  // id: { (ack: n|n: index), chunks: [...] }
  this._messages = {};

  // Window size.
  this._window = 5;

  this._setupDC();
};

// Send a message reliably.
Reliable.prototype.send = function(msg) {
  // Determine if chunking is necessary.

};

// Overwritten, typically.
Reliable.prototype.onmessage = function(msg) {

};

// Set up DataChannel handlers.
Reliable.prototype.setupDC = function() {
  // Handle various message types.
  var self = this;
  this._dc.onmessage = function(msg) {
    // TODO: binarypack unpack shits.

    var id = msg[1];
    var data = this._messages[id];
    switch (msg[0]) {
      // No chunking was done.
      case 'no':
        var message = id;
        if (!!message) {
          self.send(message);
        }
        break;
      // Reached the end of the message.
      case 'end':
        // What if 'end' is sent out of order? Eventually we will ACK for
        // and receive it, so shouldn't be a problem.
        if (!!data && data.n !== undefined) {
          self._complete(id);
          data.ack += 1;
          self._ack(id, data.ack);
        }
        break;
      case 'ack':
        if (!!data && data.n !== undefined) {
          // TODO: more optimization for window size & data sent.
          var ack = msg[2];
          // Take the larger ACK, for out of order messages.
          data.ack = Math.max(ack, data.ack);
          data.n = data.ack;
          self._sendWindowedChunks(id);
        }
        // If !data, just ignore.
        break;
      // Received a chunk of data.
      case 'chunk':
        // Create a new entry if none exists.
        if (!data) {
          data = {
            ack: 0,
            chunks: []
          };
          self._messages[id] = data;
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

};

// Sends ACK N, expecting Nth blob chunk for message ID.
Reliable.prototype._ack = function(id, n) {
  this._dc.send(['ack', id, n]);
};

// Calculates the next ACK number, given chunks.
Reliable.prototype._calculateNextAck = function(id) {
  var data = this._messages[id];
  
};

// Sends the next window of chunks.
Reliable.prototype._sendWindowedChunks = function(id) {
  var data = this._messages[id];
};

// Puts together a message from chunks.
Reliable.prototype._complete = function(id) {
  // TODO: fancy bloob stuff.
  this.onmessage(complete);
};
