import * as functions from 'firebase-functions'
import app from './backend/app.js'

export const api = functions.https.onRequest(app)
