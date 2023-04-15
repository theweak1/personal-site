import * as cron from 'node-cron'
import importDataBase from './import.mjs'

cron.schedule('0 0 1 * *', function () {
  importDataBase()
  //  console.log('running a task every minute')
})
