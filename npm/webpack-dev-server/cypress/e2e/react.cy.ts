/// <reference types="cypress" />
/// <reference path="../support/e2e.ts" />
import type { fixtureDirs } from '@tooling/system-tests'

type ProjectDirs = typeof fixtureDirs

const WEBPACK_REACT: ProjectDirs[number][] = ['webpack4_wds3-react', 'webpack4_wds4-react', 'webpack5_wds3-react', 'webpack5_wds4-react']

// Add to this list to focus on a particular permutation
const ONLY_PROJECTS: ProjectDirs[number][] = []

for (const project of WEBPACK_REACT) {
  if (ONLY_PROJECTS.length && !ONLY_PROJECTS.includes(project)) {
    continue
  }

  describe(`Working with ${project}`, () => {
    beforeEach(() => {
      cy.scaffoldProject(project)
      cy.openProject(project, ['--config-file', 'cypress-webpack.config.ts'])
      cy.startAppServer('component')
    })

    it('should mount a passing test', () => {
      cy.visitApp()
      cy.contains('App.cy.jsx').click()
      cy.get('.passed > .num').should('contain', 1)
    })

    it('MissingReact: should fail, rerun, succeed', () => {
      cy.once('uncaught:exception', () => {
        // Ignore the uncaught exception in the AUT
        return false
      })

      cy.visitApp()
      cy.contains('MissingReact.cy.jsx').click()
      cy.get('.failed > .num').should('contain', 1)
      cy.withCtx(async (ctx) => {
        await ctx.actions.file.writeFileInProject(`src/MissingReact.jsx`,
        `import React from 'react';
        ${await ctx.file.readFileInProject('src/MissingReact.jsx')}`)
      })

      cy.get('.passed > .num').should('contain', 1)
    })

    it('MissingReactInSpec: should fail, rerun, succeed', () => {
      cy.visitApp()
      cy.contains('MissingReactInSpec.cy.jsx').click()
      cy.get('.failed > .num').should('contain', 1)
      cy.withCtx(async (ctx) => {
        await ctx.actions.file.writeFileInProject(`src/MissingReactInSpec.cy.jsx`,
          await ctx.file.readFileInProject('src/App.cy.jsx'))
      })

      cy.get('.passed > .num').should('contain', 1)
    })

    // https://cypress-io.atlassian.net/browse/UNIFY-1697
    it('filters missing spec files from loader during pre-compilation', () => {
      cy.visitApp()

      // 1. assert spec executes successfully
      cy.contains('App.cy.jsx').click()
      cy.get('.passed > .num').should('contain', 1)

      // 2. remove file from file system
      cy.withCtx(async (ctx) => {
        await ctx.actions.file.removeFileInProject(`src/App.cy.jsx`)
      })

      // 3. assert redirect back to #/specs with alert presented
      cy.contains('[data-cy="alert"]', 'Spec not found')

      // 4. recreate spec, with same name as removed spec
      cy.findByTestId('new-spec-button').click()
      cy.findByRole('dialog').within(() => {
        cy.get('input').clear().type('src/App.cy.jsx')
        cy.contains('button', 'Create Spec').click()
      })

      cy.findByRole('dialog').within(() => {
        cy.contains('button', 'Okay, run the spec').click()
      })

      // 5. assert recreated spec executes successfully
      cy.get('.passed > .num').should('contain', 1)
    })
  })
}
