import { Config, Context, Layer } from "effect"
import * as path from "node:path"

export const AppConfig = Config.all({
  openaiApiKey: Config.string("OPENAI_API_KEY"),
  dataDir: Config.string("DATA_DIR").pipe(
    Config.withDefault(path.resolve(process.cwd(), "data")),
  ),
})

export type AppConfig = Config.Config.Success<typeof AppConfig>

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  AppConfig
>() {}

export const ConfigServiceLive = Layer.effect(ConfigService, AppConfig)
