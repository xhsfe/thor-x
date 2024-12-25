const dlopen = async () => {
  const math = await import('./libs/math')
  math.add(1, 1)
}

dlopen()
