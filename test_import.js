(async () => {
  try {
    await import('firebase-admin')
    console.log('IMPORT_OK')
  } catch (e) {
    console.error('IMPORT_ERR', e && e.message)
    process.exit(1)
  }
})()
