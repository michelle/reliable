# THE AWESOME PLAN TO BRING RELIABLE TRANSFER TO PEERJS WITH SOME UTILS.


## Reliable

`new Reliable(dc)`: A reliable utility class for DataChannel. Takes in a `DataChannel` object.
* `.send(msg)`: Takes a `Blob` and sends it reliably.
* `.onmessage(msg)`: Called when data is received.


## Internal Stuff

* `_chunk(bl)`: Takes in a `Blob` and spits out reasonably sized chunks.
* `_ack(num)`: Send an ack for the next message expected.
* `_complete(message_id)`: Puts together a message from chunks and emits.
* Default window size of 5.

## Message format

### ACK

This is an ACK for a chunk of the message.

```
  [
    /* type */  'ack',
    /* id */    message_id,
    /* ACK */   n   // The next chunk # expected.
  ]
```

### Chunk

This is a chunk of the message.

```
  [
    /* type */  'chunk',
    /* id */    message_id,
    /* n */     n.       // The chunk #.
    /* chunk */ chunk   // The actual binary chunk.
  ]
```


### END

This is the end of a message.

```
  [
    /* type */  'end',
    /* id */    message_id
  ]
```


### Unchunked message

This is a message that was able to be sent without being chunked.

```
  [
    /* type */  'no',
    /* msg */   payload
  ]
```
