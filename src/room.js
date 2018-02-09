export default class Room {
  constructor(dagger, room) {
    if (!dagger) {
      throw new Error('`dagger` object is required')
    }

    if (!room) {
      throw new Error('`room` is required')
    }

    this.dagger = dagger
    this.room = room
  }

  on(eventName, listener) {
    this.dagger.on(`${this.room}:${eventName}`, listener)
    return this
  }

  once(eventName, listener) {
    this.dagger.once(`${this.room}:${eventName}`, listener)
    return this
  }

  off(eventName, listener) {
    this.dagger.off(`${this.room}:${eventName}`, listener)
    return this
  }
}
