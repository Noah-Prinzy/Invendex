import "@testing-library/jest-dom/vitest"
import "fake-indexeddb/auto"
import { afterAll, afterEach, beforeAll } from "vitest"
import { mswServer } from "./mswServer"

beforeAll(() => mswServer.listen())
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())
