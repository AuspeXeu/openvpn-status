module.exports = {
  devServer: {
    proxy: {
      '/size': {
        target: 'https://status.auspex.eu',
        changeOrigin: true
      },
      '/server': {
        target: 'https://status.auspex.eu',
        changeOrigin: true
      },
      '/servers': {
        target: 'https://status.auspex.eu',
        changeOrigin: true
      },
      '/entries': {
        target: 'https://status.auspex.eu',
        changeOrigin: true
      },
      '/country': {
        target: 'https://status.auspex.eu',
        changeOrigin: true
      },
      '/log': {
        target: 'https://status.auspex.eu',
        changeOrigin: true
      },
      '/live': {
        target: 'wss://status.auspex.eu',
        changeOrigin: true,
        ws: true
      }
    }
  }
}
