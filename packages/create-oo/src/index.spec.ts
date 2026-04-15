import { someFn } from './index'

describe('test', () => {
  test('basic', () => {
    expect(someFn('Hey')).toEqual('Hello Hey')
  })
})
