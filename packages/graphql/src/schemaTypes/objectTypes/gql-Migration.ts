import { enumType, objectType } from 'nexus'
import { TestingTypeEnum } from '..'
import Debug from 'debug'
import { MIGRATION_STEPS } from '@packages/types'

const debug = Debug('cypress:graphql:gql-Migration')

export const MigrationStepEnum = enumType({
  name: 'MigrationStepEnum',
  members: MIGRATION_STEPS,
})

export const MigrationStep = objectType({
  name: 'MigrationStep',
  node: 'name',
  description: 'Contains all data related to the 9.X to 10.0 migration UI',
  definition (t) {
    t.nonNull.field('name', {
      type: MigrationStepEnum,
      description: 'Identifier of the step',
    })

    t.nonNull.boolean('isCurrentStep', {
      description: 'This is the current step',
      resolve: (source, args, ctx) => {
        return ctx.migration.step === source.name
      },
    })

    t.nonNull.boolean('isCompleted', {
      description: 'Has the current step been completed',
      resolve: (source, args, ctx) => {
        const indexOfObservedStep = ctx.migration.filteredSteps.indexOf(source.name)
        const indexOfCurrentStep = ctx.migration.filteredSteps.indexOf(ctx.migration.step)

        return indexOfObservedStep < indexOfCurrentStep
      },
    })

    t.nonNull.int('index', {
      description: 'Index of the step in the list',
      resolve: (source, args, ctx) => {
        return ctx.migration.filteredSteps.indexOf(source.name) + 1
      },
    })
  },
})

export const MigrationFilePart = objectType({
  name: 'MigrationFilePart',
  definition (t) {
    t.nonNull.string('text', {
      description: 'part of filename',
    })

    t.nonNull.boolean('highlight', {
      description: 'should highlight in migration UI',
    })
  },
})

export const MigrationFiles = objectType({
  name: 'MigrationFiles',
  definition (t) {
    t.nonNull.list.nonNull.field('before', {
      type: MigrationFile,
    })

    t.nonNull.list.nonNull.field('after', {
      type: MigrationFile,
    })
  },
})

export const ManualMigrationFile = objectType({
  name: 'ManualMigrationFile',
  definition (t) {
    t.nonNull.boolean('moved', {
      description: 'has the file been moved since opening the migration helper',
    })

    t.nonNull.string('relative', {
      description: 'name of file to migrate',
    })
  },
})

export const ManualMigration = objectType({
  name: 'ManualMigration',
  definition (t) {
    t.nonNull.list.nonNull.field('files', {
      type: ManualMigrationFile,
      description: 'files needing manual migration',
    })

    t.nonNull.boolean('completed', {
      description: 'is the manual migration completed (all files are moved)',
    })
  },
})

export const MigrationFile = objectType({
  name: 'MigrationFile',
  definition (t) {
    t.nonNull.list.nonNull.field('parts', {
      type: MigrationFilePart,
    })

    t.nonNull.field('testingType', {
      type: TestingTypeEnum,
    })
  },
})

export const MigrationRegexp = objectType({
  name: 'MigrationRegexp',
  definition (t) {
    t.nonNull.string('beforeE2E', {
      description: 'regexp to identify existing specs in e2e',
    })

    t.nonNull.string('afterE2E', {
      description: 'regexp to use to rename existing specs in e2e',
    })

    t.nonNull.string('beforeComponent', {
      description: 'regexp to identiey existing specs in component',
    })

    t.nonNull.string('afterComponent', {
      description: 'regexp to use to rename existing specs in component',
    })
  },
})

export const Migration = objectType({
  name: 'Migration',
  description: 'Contains all data related to the 9.X to 10.0 migration UI',
  definition (t) {
    t.nonNull.list.nonNull.field('filteredSteps', {
      type: MigrationStep,
      description: 'Steps filtered with the current context',
      resolve: (source, args, ctx) => {
        return ctx.migration.filteredSteps.map((name) => {
          return {
            name,
          }
        })
      },
    })

    t.nonNull.field('specFiles', {
      description: 'All spec files after conversion',
      type: MigrationFiles,
      resolve: async (source, args, ctx) => {
        const result = await ctx.migration.getSpecsForMigrationGuide()

        debug('got migration specs %o', result)

        return result
      },
    })

    t.field('manualFiles', {
      description: 'List of files needing manual conversion',
      type: ManualMigration,
      resolve: async (source, args, ctx) => {
        const status = await ctx.migration.getComponentTestingMigrationStatus()

        return {
          completed: status.completed,
          // we sort it to make sure the endpoint always returns the
          // specs in the same order, so things don't jump around.
          files: [...status.files.values()]
          .sort((x, y) => y.relative.length - x.relative.length),
        }
      },
    })

    t.field('supportFiles', {
      description: 'Support files needing automated rename',
      type: MigrationFiles,
      resolve: (source, args, ctx) => {
        return ctx.migration.supportFilesForMigrationGuide()
      },
    })

    t.nonNull.string('configBeforeCode', {
      description: 'contents of the cypress.json file before conversion',
      resolve: (source, args, ctx) => {
        return ctx.migration.getConfig()
      },
    })

    t.nonNull.string('configAfterCode', {
      description: 'contents of the cypress.json file after conversion',
      resolve: (source, args, ctx) => {
        return ctx.migration.createConfigString()
      },
    })

    t.nonNull.string('integrationFolder', {
      description: 'the integration folder path used to store e2e tests',
      resolve: (source, args, ctx) => {
        return ctx.migration.getIntegrationFolder()
      },
    })

    t.nonNull.string('componentFolder', {
      description: 'the component folder path used to store components tests',
      resolve: (source, args, ctx) => {
        return ctx.migration.getComponentFolder()
      },
    })

    t.nonNull.boolean('hasCustomIntegrationFolder', {
      description: 'whether the integration folder is custom or not',
      resolve: (source, args, ctx) => {
        return ctx.migration.hasCustomIntegrationFolder
      }
      ,
    })

    t.nonNull.boolean('hasCustomIntegrationTestFiles', {
      description: 'whether the testFiles member is custom or not in integration',
      resolve: (source, args, ctx) => {
        return ctx.migration.hasCustomIntegrationTestFiles
      },
    })

    t.nonNull.boolean('hasCustomComponentFolder', {
      description: 'whether the component folder is custom or not',
      resolve: (source, args, ctx) => {
        return ctx.migration.hasCustomComponentFolder
      },
    })

    t.nonNull.boolean('hasCustomComponentTestFiles', {
      description: 'whether the testFiles member is custom or not in component testing',
      resolve: (source, args, ctx) => {
        return ctx.migration.hasCustomComponentTestFiles
      },
    })

    t.nonNull.boolean('hasComponentTesting', {
      description: 'whether component testing is set up in the migrated config or not',
      resolve: (source, args, ctx) => {
        return ctx.migration.hasComponentTesting
      },
    })
  },
})