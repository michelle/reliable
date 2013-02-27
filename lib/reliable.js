/**
 * Reliable transfer for Chrome Canary DataChannel impl.
 * Author: @michellebu
 */
function Reliable(dc) {
  if (!(this instanceof Reliable)) return new Reliable(dc);
  this._dc = dc;

  // Messages received so far.
  // id: { ack: n, chunks: [...] }
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
        if (!!self._messages[id]) {
          self._complete(id);
          self._messages[id].ack += 1;
          self._ack(self._messages[id].ack);
        }
        break;
      case 'ack':
        break;
      case 'chunk':
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

// Puts together a message from chunks.
Reliable.prototype._complete = function(id) {
  // TODO: fancy bloob stuff.
  this.onmessage(complete);
};
