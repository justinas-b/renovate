import { query as q } from 'good-enough-parser';
import { regEx } from '../../../../util/regex';
import type { Ctx } from '../types';
import {
  cleanupTempVars,
  qPropertyAccessIdentifier,
  qStringValue,
  qTemplateString,
  qVariableAccessIdentifier,
  storeInTokenMap,
  storeVarToken,
} from './common';
import { handlePlugin } from './handlers';

const qVersion = q
  .alt(qTemplateString, qPropertyAccessIdentifier, qVariableAccessIdentifier)
  .handler((ctx) => storeInTokenMap(ctx, 'version'));

// kotlin("jvm") version "1.3.71"
export const qPlugins = q
  .sym(regEx(/^(?:id|kotlin)$/), storeVarToken)
  .handler((ctx) => storeInTokenMap(ctx, 'methodName'))
  .alt(
    // id "foo.bar" version "1.2.3"
    qStringValue
      .handler((ctx: Ctx) => storeInTokenMap(ctx, 'pluginName'))
      .sym('version')
      .join(qVersion),
    q
      .tree({
        type: 'wrapped-tree',
        maxDepth: 1,
        startsWith: '(',
        endsWith: ')',
        search: q.begin<Ctx>().join(qStringValue).end(),
      })
      .handler((ctx) => storeInTokenMap(ctx, 'pluginName'))
      .alt(
        // id("foo.bar") version "1.2.3"
        q.sym<Ctx>('version').join(qVersion),
        // id("foo.bar").version("1.2.3")
        q
          .op<Ctx>('.')
          .sym('version')
          .tree({
            maxDepth: 1,
            startsWith: '(',
            endsWith: ')',
            search: q.begin<Ctx>().join(qVersion).end(),
          })
      )
  )
  .handler(handlePlugin)
  .handler(cleanupTempVars);
