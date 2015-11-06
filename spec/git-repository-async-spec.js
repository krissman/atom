'use babel'

const fs = require('fs-plus')
const path = require('path')
const temp = require('temp')

const GitRepositoryAsync = require('../src/git-repository-async')

const openFixture = (fixture) => {
  GitRepositoryAsync.open(path.join(__dirname, 'fixtures', 'git', fixture))
}

const copyRepository = () => {
  let workingDirPath = temp.mkdirSync('atom-working-dir')
  fs.copySync(path.join(__dirname, 'fixtures', 'git', 'working-dir'), workingDirPath)
  fs.renameSync(path.join(workingDirPath, 'git.git'), path.join(workingDirPath, '.git'))
  return fs.realpathSync(workingDirPath)
}

describe('GitRepositoryAsync', function () {
  describe('buffer events', () => {

    it('emits a status-changed events when a buffer is saved', () => {
      let editor, called

      atom.project.setPaths([copyRepository()])
      waitsForPromise(async function () {
        editor = await atom.workspace.open('other.txt')
        editor.insertNewline()
        let repo = atom.project.getRepositories()[0]
        repo.async.onDidChangeStatus((c) => {
          called = c
        })
        editor.save()

        waitsFor(() => {
          return Boolean(called)
        })
      })

      runs(() => {
        expect(called).toEqual({path: editor.getPath(), pathStatus: 256})
      })
    })

    it('emits a status-changed event when a buffer is reloaded', () => {
      let editor
      let statusHandler = jasmine.createSpy('statusHandler')
      let reloadHandler = jasmine.createSpy('reloadHandler')

      waitsForPromise(async function() {
        editor = await atom.workspace.open('other.txt')

        fs.writeFileSync(editor.getPath(), 'changed')

        atom.project.getRepositories()[0].async.onDidChangeStatus(statusHandler)
        editor.getBuffer().reload()

        waitsFor(function () {
          return statusHandler.callCount === 1
        })
      })

      runs(function () {
        expect(statusHandler.callCount).toBe(1)
        // Not sure why the sync spec expects WT_MODIFIED, `other.txt` is not in
        // the index yet.
        expect(statusHandler).toHaveBeenCalledWith({path: editor.getPath(), pathStatus: Git.Status.STATUS.WT_NEW})

        let buffer = editor.getBuffer()
        buffer.onDidReload(reloadHandler)
        buffer.reload()
      })

      waitsFor(function () {
        return reloadHandler.callCount === 1
      })

      runs(function () {
        expect(statusHandler.callCount).toBe(1)
      })
    })

    xit('emits a status-changed event when a buffer\'s path changes')
  })

  xdescribe('GitRepositoryAsync::relativize(filePath)')
})
