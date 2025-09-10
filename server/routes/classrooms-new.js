const express = require('express')
const router = express.Router()

// Test route to verify router works
router.get('/test', (req, res) => {
  res.json({ message: 'New classrooms router is working!' })
})

module.exports = router
