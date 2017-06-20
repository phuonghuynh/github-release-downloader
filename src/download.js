'use strict'
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { promisify, delay } = require('bluebird')
const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)
const existsAsync = promisify(function exists2(path, exists2callback) {
    fs.exists(path, function callbackWrapper(exists) { exists2callback(null, exists) })
})

async function ensureDirectoryExistence(filePath) {
  const dirnames = [path.dirname(filePath)]
  let backTracking = false
  while (dirnames.length > 0) {
    const dirname = dirnames.pop()
    if (backTracking) {
      await mkdirAsync(dirname)
    }
    else if (await existsAsync(dirname)) {
      backTracking = true
    }
    else {
      dirnames.push(dirname, path.dirname(dirname))
    }
  }
}

module.exports.DownloadsScheduler = class DownloadsScheduler {
  constructor(dest, parallelism = 1) {
    this.instance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) \
        AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    })
    this.dest = dest
    this.parallelism = parallelism
    this.queue = []
  }

  enqueue(entry) {
    this.queue.push(entry)
  }

  async handleDownload(entry) {
    const { filename, url } = entry
    console.log('fetching', filename)
    const response = await this.instance.get(url, {
      responseType: 'arraybuffer'
    })
    const fullfilename = path.join(this.dest, filename)
    await ensureDirectoryExistence(fullfilename)
    console.log('writing', filename)
    await writeFileAsync(fullfilename, response.data)
  }

  async enqueueDownloadTask(initial) {
    this.handleDownload(initial)
    while (this.queue.length > 0) {
      const entry = this.queue.shift()
      await this.handleDownload(entry)
      await delay(1000)
    }
  }

  async start() {
    const pendingTasks = this.queue.splice(0, this.parallelism)
      .map(entry => this.enqueueDownloadTask(entry))
    await Promise.all(pendingTasks)
  }
}