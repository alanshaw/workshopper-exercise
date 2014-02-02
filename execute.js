const spawn = require('child_process').spawn
    , path  = require('path')
    , fs    = require('fs')
    , after = require('after')


function execute (exercise) {
  exercise.addSetup(setup)
  exercise.addProcessor(processor)


  // override if you want to mess with stdout
  exercise.getStdout = function (type, child) {
    // type == 'submission' || 'solution'
    return child.stdout
  }

  exercise.getSolutionFiles = function (callback) {
    var solutionDir = path.join(this.dir, './solution/')

    fs.readdir(solutionDir, function (err, list) {
      if (err)
        return callback(err)

      list = list
        .filter(function (f) { return (/\.js$/).test(f) })
        .map(function (f) { return path.join(solutionDir, f)})

      callback(null, list)
    })
  }


  return exercise
}


function setup (mode, callback) {
  this.submission = this.args.shift() // first arg obviously

  // default args, override if you want to pass special args to the
  // solution and/or submission, override this.setup to do this
  this.submissionArgs = Array.prototype.slice.call(this.args)
  this.solutionArgs   = Array.prototype.slice.call(this.args)

  // edit/override if you want to alter the child process environment
  this.env            = Array.prototype.slice.call(process.env)

  // set this.solution if your solution is elsewhere
  if (!this.solution)
    this.solution = path.join(this.dir, './solution/index.js')

  callback()
}


function kill () {
  ;[ this.submissionChild, this.solutionChild ].forEach(function (child) {
    if (child && typeof child.kill == 'function')
      child.kill()
  })

  setTimeout(function () {
    this.emit('executeEnd')
  }.bind(this), 10)
}


function processor (mode, callback) {
  var ended = after(mode == 'verify' ? 2 : 1, kill.bind(this))

  this.submissionChild  = spawn(process.execPath, [ this.submission ].concat(this.submissionArgs), this.env)
  this.submissionStdout = this.getStdout('submission', this.submissionChild)

  this.submissionStdout.on('end', ended)

  if (mode == 'verify') {
    this.solutionChild  = spawn(process.execPath, [ this.solution ].concat(this.solutionArgs), this.env)
    this.solutionStdout = this.getStdout('solution', this.solutionChild)

    this.solutionStdout.on('end', ended)
  }

  callback()
}


module.exports = execute