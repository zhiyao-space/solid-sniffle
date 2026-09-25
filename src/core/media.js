export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function fileToDataURL(file, max = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
