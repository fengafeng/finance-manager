import express, { Application } from 'express'
import cors from 'cors'
import compression from 'compression'
import 'express-async-errors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { accountRouter } from './modules/account'
import { transactionRouter } from './modules/transaction'
import { fundRouter } from './modules/fund'
import { categoryRouter } from './modules/category'
import { reportRouter } from './modules/report'
import { netWorthRouter } from './modules/net-worth'
import { healthRouter } from './modules/health'
import { loanRouter } from './modules/loan'
import { recurringRouter } from './modules/recurring'
import { automationRouter } from './modules/automation'
import { aiChatRouter } from './modules/ai-chat'
import { budgetRouter } from './modules/budget'
import { providentFundRouter } from './modules/providentFund'
import { importRouter } from './modules/import'

export const createApp = (): Application => {
  const app = express()

  // HTTP request logging
  app.use(httpLogger)

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )

  // Body parsing and compression
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // Domain routes
  app.use(`${env.API_PREFIX}/accounts`, accountRouter)
  app.use(`${env.API_PREFIX}/transactions`, transactionRouter)
  app.use(`${env.API_PREFIX}/funds`, fundRouter)
  app.use(`${env.API_PREFIX}/categories`, categoryRouter)
  app.use(`${env.API_PREFIX}/reports`, reportRouter)
  
  // Phase 2 routes
  app.use(`${env.API_PREFIX}/net-worth`, netWorthRouter)
  app.use(`${env.API_PREFIX}/health`, healthRouter)
  app.use(`${env.API_PREFIX}/loans`, loanRouter)
  app.use(`${env.API_PREFIX}/recurring`, recurringRouter)
  app.use(`${env.API_PREFIX}/automation`, automationRouter)
  app.use(`${env.API_PREFIX}/ai-chat`, aiChatRouter)

  // Phase 3 routes
  app.use(`${env.API_PREFIX}/budgets`, budgetRouter)
  app.use(`${env.API_PREFIX}/provident-funds`, providentFundRouter)

  // Import routes
  app.use(`${env.API_PREFIX}/import`, importRouter)

  // Error handling
  app.use(errorHandler)

  return app
}
