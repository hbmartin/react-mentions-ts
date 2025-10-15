const keys = <T extends object>(obj: T | null | undefined): Array<keyof T> => {
  if (obj == undefined) {
    return []
  }
  return Object.keys(obj) as Array<keyof T>
}

export default keys
