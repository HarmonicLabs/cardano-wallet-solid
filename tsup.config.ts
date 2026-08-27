import { defineConfig } from 'tsup'
import * as preset from 'tsup-preset-solid'

const preset_options: preset.PresetOptions = {
  entries: [
    // headless core — no UI deps, safe for any Solid app
    { entry: 'src/index.ts' },
    // optional SUID connect button
    { entry: 'src/suid/index.tsx', name: 'suid' },
  ],
  drop_console: false,
}

const CI =
  process.env['CI'] === 'true' ||
  process.env['GITHUB_ACTIONS'] === 'true'

export default defineConfig(config => {
  const watching = !!config.watch
  const parsed = preset.parsePresetOptions(preset_options, watching)
  if (!watching && !CI) {
    preset.writePackageJson(preset.generatePackageExports(parsed))
  }
  return preset.generateTsupOptions(parsed)
})
