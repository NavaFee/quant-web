import sample from '../../public/samples/result.json'
import { parseResult } from '../lib/result'

export const sampleText = JSON.stringify(sample)
export const fixture = () => parseResult(sampleText)
