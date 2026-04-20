const REACT_MENTIONS_PACKAGE = 'react-mentions'
const REACT_MENTIONS_TS_PACKAGE = 'react-mentions-ts'

const COMPONENT_EXPORTS = new Set(['MentionsInput', 'Mention'])
const HELPER_EXPORTS = new Set(['makeTriggerRegex', 'createMarkupSerializer'])
const CHANGE_WRAPPER_PARAM = 'change'
const ADD_WRAPPER_PARAM = 'addition'

const CHANGE_PAYLOAD_FIELDS = [
  { legacyIndex: 1, payloadName: 'value' },
  { legacyIndex: 2, payloadName: 'plainTextValue' },
  { legacyIndex: 3, payloadName: 'mentions' },
]

const ADD_PAYLOAD_FIELDS = [
  { legacyIndex: 0, payloadName: 'id' },
  { legacyIndex: 1, payloadName: 'display' },
  { legacyIndex: 2, payloadName: 'startPos' },
  { legacyIndex: 3, payloadName: 'endPos' },
]

const createState = () => ({
  mentionInputNames: new Set(),
  mentionNames: new Set(),
  namespaceNames: new Set(),
  helperLocals: new Map(),
  requiredHelpers: new Map(),
  hasReactMentionsReference: false,
  hasReactMentionsImport: false,
  hasReactMentionsRequire: false,
})

const isReactMentionsSource = (node) =>
  node?.value === REACT_MENTIONS_PACKAGE || node?.value === REACT_MENTIONS_TS_PACKAGE

const getStringLiteralValue = (node) => {
  if (!node) {
    return null
  }

  if (node.type === 'Literal' || node.type === 'StringLiteral') {
    return typeof node.value === 'string' ? node.value : null
  }

  return null
}

const setStringLiteralValue = (node, value) => {
  node.value = value
  if ('raw' in node) {
    node.raw = `'${value}'`
  }
}

const getJSXAttributeName = (attribute) =>
  attribute?.type === 'JSXAttribute' && attribute.name?.type === 'JSXIdentifier'
    ? attribute.name.name
    : null

const findJSXAttribute = (openingElement, name) =>
  openingElement.attributes?.find((attribute) => getJSXAttributeName(attribute) === name) ?? null

const removeJSXAttribute = (openingElement, name) => {
  openingElement.attributes = (openingElement.attributes ?? []).filter(
    (attribute) => getJSXAttributeName(attribute) !== name
  )
}

const upsertJSXAttribute = (openingElement, attribute) => {
  removeJSXAttribute(openingElement, attribute.name.name)
  openingElement.attributes = [...(openingElement.attributes ?? []), attribute]
}

const getJSXExpression = (attribute) => {
  if (!attribute?.value || attribute.value.type !== 'JSXExpressionContainer') {
    return null
  }

  return attribute.value.expression.type === 'JSXEmptyExpression'
    ? null
    : attribute.value.expression
}

const getBooleanAttributeValue = (attribute) => {
  if (!attribute) {
    return { kind: 'missing' }
  }

  if (!attribute.value) {
    return { kind: 'static', value: true }
  }

  if (attribute.value.type === 'Literal' || attribute.value.type === 'StringLiteral') {
    if (attribute.value.value === 'true') {
      return { kind: 'static', value: true }
    }

    if (attribute.value.value === 'false') {
      return { kind: 'static', value: false }
    }
  }

  const expression = getJSXExpression(attribute)

  if (!expression) {
    return { kind: 'dynamic', expression: null }
  }

  if (expression.type === 'BooleanLiteral') {
    return { kind: 'static', value: expression.value }
  }

  if (expression.type === 'Literal' && typeof expression.value === 'boolean') {
    return { kind: 'static', value: expression.value }
  }

  return { kind: 'dynamic', expression }
}

const getStaticStringAttributeValue = (attribute) => {
  if (!attribute?.value) {
    return null
  }

  if (attribute.value.type === 'Literal' || attribute.value.type === 'StringLiteral') {
    return typeof attribute.value.value === 'string' ? attribute.value.value : null
  }

  const expression = getJSXExpression(attribute)

  if (expression?.type === 'Literal' || expression?.type === 'StringLiteral') {
    return typeof expression.value === 'string' ? expression.value : null
  }

  if (expression?.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return expression.quasis[0]?.value.cooked ?? null
  }

  return null
}

const getRequireSource = (callExpression) => {
  if (
    callExpression?.type !== 'CallExpression' ||
    callExpression.callee.type !== 'Identifier' ||
    callExpression.callee.name !== 'require'
  ) {
    return null
  }

  return getStringLiteralValue(callExpression.arguments[0])
}

const isRequireFromReactMentions = (callExpression) =>
  getRequireSource(callExpression) === REACT_MENTIONS_PACKAGE ||
  getRequireSource(callExpression) === REACT_MENTIONS_TS_PACKAGE

const createRequireCall = (j) =>
  j.callExpression(j.identifier('require'), [j.literal(REACT_MENTIONS_TS_PACKAGE)])

const report = (api, fileInfo, message) => {
  api.report(`[react-mentions-ts codemod] ${fileInfo.path}: ${message}`)
}

const collectImportBindings = (declaration, state) => {
  state.hasReactMentionsReference = true
  state.hasReactMentionsImport = true

  for (const specifier of declaration.specifiers ?? []) {
    if (specifier.type === 'ImportNamespaceSpecifier' && specifier.local?.name) {
      state.namespaceNames.add(specifier.local.name)
      continue
    }

    if (specifier.type !== 'ImportSpecifier') {
      continue
    }

    const exportedName = specifier.imported?.name ?? specifier.imported?.value
    const localName = specifier.local?.name ?? exportedName

    if (exportedName === 'MentionsInput') {
      state.mentionInputNames.add(localName)
    }

    if (exportedName === 'Mention') {
      state.mentionNames.add(localName)
    }

    if (HELPER_EXPORTS.has(exportedName)) {
      state.helperLocals.set(exportedName, localName)
    }
  }
}

const collectRequireBindings = (declarator, state) => {
  state.hasReactMentionsReference = true
  state.hasReactMentionsRequire = true

  if (declarator.id.type === 'Identifier') {
    state.namespaceNames.add(declarator.id.name)
    return
  }

  if (declarator.id.type !== 'ObjectPattern') {
    return
  }

  for (const property of declarator.id.properties) {
    if (property.type !== 'Property' && property.type !== 'ObjectProperty') {
      continue
    }

    const exportedName = property.key.name ?? property.key.value
    const localName = property.value?.name ?? exportedName

    if (exportedName === 'MentionsInput') {
      state.mentionInputNames.add(localName)
    }

    if (exportedName === 'Mention') {
      state.mentionNames.add(localName)
    }

    if (HELPER_EXPORTS.has(exportedName)) {
      state.helperLocals.set(exportedName, localName)
    }
  }
}

const rewritePackageReferences = (root, j, state) => {
  root.find(j.ImportDeclaration).forEach((path) => {
    if (!isReactMentionsSource(path.value.source)) {
      return
    }

    collectImportBindings(path.value, state)
    setStringLiteralValue(path.value.source, REACT_MENTIONS_TS_PACKAGE)
  })

  root.find(j.CallExpression).forEach((path) => {
    if (getRequireSource(path.value) !== REACT_MENTIONS_PACKAGE) {
      return
    }

    setStringLiteralValue(path.value.arguments[0], REACT_MENTIONS_TS_PACKAGE)

    const parent = path.parent?.value
    if (parent?.type === 'VariableDeclarator') {
      collectRequireBindings(parent, state)
    } else {
      state.hasReactMentionsReference = true
      state.hasReactMentionsRequire = true
    }
  })
}

const getJSXRole = (name, state) => {
  if (name.type === 'JSXIdentifier') {
    if (state.mentionInputNames.has(name.name)) {
      return 'MentionsInput'
    }

    if (state.mentionNames.has(name.name)) {
      return 'Mention'
    }

    return null
  }

  if (
    name.type === 'JSXMemberExpression' &&
    name.object.type === 'JSXIdentifier' &&
    name.property.type === 'JSXIdentifier' &&
    state.namespaceNames.has(name.object.name) &&
    COMPONENT_EXPORTS.has(name.property.name)
  ) {
    return name.property.name
  }

  return null
}

const nodeContainsIdentifier = (j, node, name) => j(node).find(j.Identifier, { name }).size() > 0

const fileContainsIdentifier = (root, j, name) => root.find(j.Identifier, { name }).size() > 0

const chooseLocalName = (root, j, baseName) => {
  if (!fileContainsIdentifier(root, j, baseName)) {
    return baseName
  }

  const fallback =
    baseName === 'makeTriggerRegex'
      ? 'reactMentionsMakeTriggerRegex'
      : 'reactMentionsCreateMarkupSerializer'

  if (!fileContainsIdentifier(root, j, fallback)) {
    return fallback
  }

  let index = 2
  while (fileContainsIdentifier(root, j, `${fallback}${index}`)) {
    index += 1
  }

  return `${fallback}${index}`
}

const getHelperIdentifier = (root, j, state, exportedName) => {
  if (!state.helperLocals.has(exportedName)) {
    const localName = chooseLocalName(root, j, exportedName)
    state.helperLocals.set(exportedName, localName)
    state.requiredHelpers.set(exportedName, localName)
  }

  return j.identifier(state.helperLocals.get(exportedName))
}

const createImportSpecifier = (j, exportedName, localName) => {
  const specifier = j.importSpecifier(j.identifier(exportedName))

  if (localName !== exportedName) {
    specifier.local = j.identifier(localName)
  }

  return specifier
}

const createObjectPatternProperty = (j, exportedName, localName) => {
  const property = j.property('init', j.identifier(exportedName), j.identifier(localName))
  property.shorthand = exportedName === localName
  return property
}

const addHelperImports = (root, j, state) => {
  if (state.requiredHelpers.size === 0) {
    return
  }

  const importDeclarations = root
    .find(j.ImportDeclaration)
    .filter((path) => path.value.source.value === REACT_MENTIONS_TS_PACKAGE)

  const importPaths = importDeclarations.paths()
  const firstImportPath = importPaths.find(
    (path) =>
      (path.value.specifiers ?? []).length > 0 &&
      !(path.value.specifiers ?? []).some(
        (specifier) => specifier.type === 'ImportNamespaceSpecifier'
      )
  )

  if (firstImportPath) {
    firstImportPath.value.specifiers = firstImportPath.value.specifiers ?? []

    for (const [exportedName, localName] of state.requiredHelpers) {
      firstImportPath.value.specifiers.push(createImportSpecifier(j, exportedName, localName))
    }

    return
  }

  if (importPaths.length > 0) {
    const helperImport = j.importDeclaration(
      [...state.requiredHelpers].map(([exportedName, localName]) =>
        createImportSpecifier(j, exportedName, localName)
      ),
      j.literal(REACT_MENTIONS_TS_PACKAGE)
    )
    const body = root.get().node.program.body
    const lastImportIndex = body.reduce(
      (lastIndex, statement, index) => (statement.type === 'ImportDeclaration' ? index : lastIndex),
      -1
    )

    body.splice(lastImportIndex + 1, 0, helperImport)
    return
  }

  const requireDeclarators = root
    .find(j.VariableDeclarator)
    .filter((path) => isRequireFromReactMentions(path.value.init))

  const objectPatternRequirePath = requireDeclarators
    .paths()
    .find((path) => path.value.id.type === 'ObjectPattern')

  if (objectPatternRequirePath) {
    objectPatternRequirePath.value.id.properties =
      objectPatternRequirePath.value.id.properties ?? []

    for (const [exportedName, localName] of state.requiredHelpers) {
      objectPatternRequirePath.value.id.properties.push(
        createObjectPatternProperty(j, exportedName, localName)
      )
    }

    return
  }

  const helperPattern = j.objectPattern(
    [...state.requiredHelpers].map(([exportedName, localName]) =>
      createObjectPatternProperty(j, exportedName, localName)
    )
  )

  const helperDeclaration = j.variableDeclaration('const', [
    j.variableDeclarator(helperPattern, createRequireCall(j)),
  ])

  const body = root.get().node.program.body
  const insertIndex = body.reduce((lastIndex, statement, index) => {
    if (statement.type === 'ImportDeclaration') {
      return index
    }

    if (
      statement.type === 'VariableDeclaration' &&
      statement.declarations.some((declaration) => isRequireFromReactMentions(declaration.init))
    ) {
      return index
    }

    return lastIndex
  }, -1)

  body.splice(insertIndex + 1, 0, helperDeclaration)
}

const createPayloadProperty = (j, payloadName, localName) => {
  const property = j.property('init', j.identifier(payloadName), j.identifier(localName))
  property.shorthand = payloadName === localName
  return property
}

const getIdentifierParam = (param) => (param?.type === 'Identifier' ? param : null)

const prependEventAlias = (j, body, eventName, triggerName) => {
  const eventAlias = j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier(eventName),
      j.memberExpression(j.identifier(triggerName), j.identifier('nativeEvent'))
    ),
  ])

  body.body.unshift(eventAlias)
}

const ensureBlockBody = (j, functionNode) => {
  if (functionNode.body.type === 'BlockStatement') {
    return functionNode.body
  }

  const expression = functionNode.body
  functionNode.body = j.blockStatement([j.returnStatement(expression)])
  functionNode.expression = false

  return functionNode.body
}

const convertInlineFunction = ({ j, functionNode, payloadFields, eventParamIndex = null }) => {
  if (
    functionNode.params.some(
      (param) => param.type !== 'Identifier' && param.type !== 'AssignmentPattern'
    )
  ) {
    return false
  }

  const body = functionNode.body
  const properties = []
  let eventAlias = null
  let triggerLocalName = null

  if (eventParamIndex !== null) {
    const eventParam = getIdentifierParam(functionNode.params[eventParamIndex])
    if (eventParam && nodeContainsIdentifier(j, body, eventParam.name)) {
      eventAlias = eventParam.name
      triggerLocalName = nodeContainsIdentifier(j, body, 'trigger') ? 'changeTrigger' : 'trigger'
      properties.push(createPayloadProperty(j, 'trigger', triggerLocalName))
    }
  }

  for (const { legacyIndex, payloadName } of payloadFields) {
    const param = getIdentifierParam(functionNode.params[legacyIndex])
    if (param) {
      properties.push(createPayloadProperty(j, payloadName, param.name))
    }
  }

  functionNode.params = properties.length === 0 ? [] : [j.objectPattern(properties)]

  if (eventAlias && triggerLocalName) {
    prependEventAlias(j, ensureBlockBody(j, functionNode), eventAlias, triggerLocalName)
  }

  return true
}

const createWrapperParam = (j, root, expression, baseName) => {
  let localName = baseName

  if (nodeContainsIdentifier(j, expression, localName)) {
    localName = `legacy${baseName[0].toUpperCase()}${baseName.slice(1)}`
  }

  if (fileContainsIdentifier(root, j, localName)) {
    let index = 2
    while (fileContainsIdentifier(root, j, `${localName}${index}`)) {
      index += 1
    }

    localName = `${localName}${index}`
  }

  return j.identifier(localName)
}

const createLegacyChangeWrapper = (j, root, handlerExpression) => {
  const param = createWrapperParam(j, root, handlerExpression, CHANGE_WRAPPER_PARAM)
  const paramName = param.name

  return j.arrowFunctionExpression(
    [param],
    j.callExpression(handlerExpression, [
      j.memberExpression(
        j.memberExpression(j.identifier(paramName), j.identifier('trigger')),
        j.identifier('nativeEvent')
      ),
      j.memberExpression(j.identifier(paramName), j.identifier('value')),
      j.memberExpression(j.identifier(paramName), j.identifier('plainTextValue')),
      j.memberExpression(j.identifier(paramName), j.identifier('mentions')),
    ])
  )
}

const createLegacyAddWrapper = (j, root, handlerExpression) => {
  const param = createWrapperParam(j, root, handlerExpression, ADD_WRAPPER_PARAM)
  const paramName = param.name

  return j.arrowFunctionExpression(
    [param],
    j.callExpression(handlerExpression, [
      j.memberExpression(j.identifier(paramName), j.identifier('id')),
      j.memberExpression(j.identifier(paramName), j.identifier('display')),
      j.memberExpression(j.identifier(paramName), j.identifier('startPos')),
      j.memberExpression(j.identifier(paramName), j.identifier('endPos')),
    ])
  )
}

const isWrappableExpression = (expression) =>
  expression?.type === 'Identifier' ||
  expression?.type === 'MemberExpression' ||
  expression?.type === 'OptionalMemberExpression'

const migrateCallbackAttribute = ({
  api,
  fileInfo,
  j,
  root,
  attribute,
  nextName,
  payloadFields,
  eventParamIndex = null,
  createWrapper,
}) => {
  attribute.name.name = nextName

  const expression = getJSXExpression(attribute)
  if (!expression) {
    report(api, fileInfo, `Could not inspect ${nextName}; verify its callback signature manually.`)
    return
  }

  if (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression') {
    const converted = convertInlineFunction({
      j,
      functionNode: expression,
      payloadFields,
      eventParamIndex,
    })

    if (!converted) {
      report(
        api,
        fileInfo,
        `Could not rewrite ${nextName}; verify its callback signature manually.`
      )
    }

    return
  }

  if (isWrappableExpression(expression)) {
    attribute.value = j.jsxExpressionContainer(createWrapper(j, root, expression))
    return
  }

  report(api, fileInfo, `Could not rewrite ${nextName}; verify its callback signature manually.`)
}

const migrateSuggestionPlacement = (api, fileInfo, j, openingElement) => {
  if (findJSXAttribute(openingElement, 'suggestionsPlacement')) {
    removeJSXAttribute(openingElement, 'allowSuggestionsAboveCursor')
    removeJSXAttribute(openingElement, 'forceSuggestionsAboveCursor')
    return
  }

  const allowAttribute = findJSXAttribute(openingElement, 'allowSuggestionsAboveCursor')
  const forceAttribute = findJSXAttribute(openingElement, 'forceSuggestionsAboveCursor')
  const allowValue = getBooleanAttributeValue(allowAttribute)
  const forceValue = getBooleanAttributeValue(forceAttribute)

  removeJSXAttribute(openingElement, 'allowSuggestionsAboveCursor')
  removeJSXAttribute(openingElement, 'forceSuggestionsAboveCursor')

  if (forceValue.kind === 'static' && forceValue.value === true) {
    upsertJSXAttribute(
      openingElement,
      j.jsxAttribute(j.jsxIdentifier('suggestionsPlacement'), j.literal('above'))
    )
    return
  }

  if (allowValue.kind === 'static' && allowValue.value === true) {
    upsertJSXAttribute(
      openingElement,
      j.jsxAttribute(j.jsxIdentifier('suggestionsPlacement'), j.literal('auto'))
    )
    return
  }

  const dynamicForce = forceValue.kind === 'dynamic' ? forceValue.expression : null
  const dynamicAllow = allowValue.kind === 'dynamic' ? allowValue.expression : null

  if (dynamicForce || dynamicAllow) {
    report(
      api,
      fileInfo,
      'Converted dynamic suggestion placement props; verify the resulting suggestionsPlacement behavior.'
    )

    const below = j.literal('below')
    const auto = j.literal('auto')
    const above = j.literal('above')
    const expression = dynamicForce
      ? j.conditionalExpression(
          dynamicForce,
          above,
          dynamicAllow ? j.conditionalExpression(dynamicAllow, auto, below) : below
        )
      : j.conditionalExpression(dynamicAllow, auto, below)

    upsertJSXAttribute(
      openingElement,
      j.jsxAttribute(j.jsxIdentifier('suggestionsPlacement'), j.jsxExpressionContainer(expression))
    )
  }
}

const createTriggerOptions = (j, options) =>
  j.objectExpression(
    Object.entries(options)
      .filter(([, value]) => value === true)
      .map(([key]) => {
        const property = j.property('init', j.identifier(key), j.literal(true))
        property.shorthand = false
        return property
      })
  )

const createMakeTriggerRegexCall = (root, j, state, triggerValue, options) =>
  j.callExpression(getHelperIdentifier(root, j, state, 'makeTriggerRegex'), [
    j.literal(triggerValue),
    createTriggerOptions(j, options),
  ])

const migrateMentionTrigger = ({ api, fileInfo, j, root, state, openingElement, options }) => {
  const triggerAttribute = findJSXAttribute(openingElement, 'trigger')
  const triggerValue = triggerAttribute ? getStaticStringAttributeValue(triggerAttribute) : '@'

  if (triggerValue === null) {
    report(
      api,
      fileInfo,
      'Could not move allowSpaceInQuery/ignoreAccents onto a dynamic Mention trigger; verify this Mention manually.'
    )
    return
  }

  const nextTriggerAttribute = j.jsxAttribute(
    j.jsxIdentifier('trigger'),
    j.jsxExpressionContainer(createMakeTriggerRegexCall(root, j, state, triggerValue, options))
  )

  upsertJSXAttribute(openingElement, nextTriggerAttribute)
}

const visitMentionChildren = (element, state, callback) => {
  for (const child of element.children ?? []) {
    if (child.type !== 'JSXElement') {
      continue
    }

    if (getJSXRole(child.openingElement.name, state) === 'Mention') {
      callback(child)
    }

    visitMentionChildren(child, state, callback)
  }
}

const migrateQueryOptions = ({ api, fileInfo, j, root, state, element, openingElement }) => {
  const allowAttribute = findJSXAttribute(openingElement, 'allowSpaceInQuery')
  const ignoreAttribute = findJSXAttribute(openingElement, 'ignoreAccents')
  const allowValue = getBooleanAttributeValue(allowAttribute)
  const ignoreValue = getBooleanAttributeValue(ignoreAttribute)

  removeJSXAttribute(openingElement, 'allowSpaceInQuery')
  removeJSXAttribute(openingElement, 'ignoreAccents')

  if (allowValue.kind === 'dynamic' || ignoreValue.kind === 'dynamic') {
    report(
      api,
      fileInfo,
      'Removed dynamic allowSpaceInQuery/ignoreAccents props; move equivalent trigger regex options manually.'
    )
    return
  }

  const options = {
    allowSpaceInQuery: allowValue.kind === 'static' && allowValue.value === true,
    ignoreAccents: ignoreValue.kind === 'static' && ignoreValue.value === true,
  }

  if (!options.allowSpaceInQuery && !options.ignoreAccents) {
    return
  }

  visitMentionChildren(element, state, (mentionElement) => {
    migrateMentionTrigger({
      api,
      fileInfo,
      j,
      root,
      state,
      openingElement: mentionElement.openingElement,
      options,
    })
  })
}

const isStaticMarkupAttribute = (attribute) => getStaticStringAttributeValue(attribute) !== null

const migrateRegexAttribute = ({ api, fileInfo, j, root, state, openingElement }) => {
  const regexAttribute = findJSXAttribute(openingElement, 'regex')
  if (!regexAttribute) {
    return
  }

  const markupAttribute = findJSXAttribute(openingElement, 'markup')
  if (!isStaticMarkupAttribute(markupAttribute)) {
    report(
      api,
      fileInfo,
      'Mention regex prop requires manual migration because markup is missing or dynamic.'
    )
    return
  }

  const markup = getStaticStringAttributeValue(markupAttribute)
  removeJSXAttribute(openingElement, 'regex')

  markupAttribute.value = j.jsxExpressionContainer(
    j.callExpression(getHelperIdentifier(root, j, state, 'createMarkupSerializer'), [
      j.literal(markup),
    ])
  )
}

const inspectAsyncDataProvider = (api, fileInfo, openingElement) => {
  const dataAttribute = findJSXAttribute(openingElement, 'data')
  const expression = getJSXExpression(dataAttribute)

  if (
    (expression?.type === 'ArrowFunctionExpression' || expression?.type === 'FunctionExpression') &&
    expression.params.length >= 2
  ) {
    report(
      api,
      fileInfo,
      'Mention data provider still appears to use callback-style async results; migrate it to return an array or promise.'
    )
  }
}

const migrateMentionsInputElement = ({ api, fileInfo, j, root, state, element }) => {
  const openingElement = element.openingElement
  const onChangeAttribute = findJSXAttribute(openingElement, 'onChange')
  if (onChangeAttribute) {
    migrateCallbackAttribute({
      api,
      fileInfo,
      j,
      root,
      attribute: onChangeAttribute,
      nextName: 'onMentionsChange',
      payloadFields: CHANGE_PAYLOAD_FIELDS,
      eventParamIndex: 0,
      createWrapper: createLegacyChangeWrapper,
    })
  }

  const onBlurAttribute = findJSXAttribute(openingElement, 'onBlur')
  if (onBlurAttribute) {
    onBlurAttribute.name.name = 'onMentionBlur'
  }

  migrateSuggestionPlacement(api, fileInfo, j, openingElement)
  migrateQueryOptions({ api, fileInfo, j, root, state, element, openingElement })
}

const migrateMentionElement = ({ api, fileInfo, j, root, state, element }) => {
  const openingElement = element.openingElement
  const onAddAttribute = findJSXAttribute(openingElement, 'onAdd')

  if (onAddAttribute) {
    migrateCallbackAttribute({
      api,
      fileInfo,
      j,
      root,
      attribute: onAddAttribute,
      nextName: 'onAdd',
      payloadFields: ADD_PAYLOAD_FIELDS,
      createWrapper: createLegacyAddWrapper,
    })
  }

  migrateRegexAttribute({ api, fileInfo, j, root, state, openingElement })
  inspectAsyncDataProvider(api, fileInfo, openingElement)
}

module.exports = function transform(fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)
  const state = createState()

  rewritePackageReferences(root, j, state)

  if (!state.hasReactMentionsReference) {
    return fileInfo.source
  }

  root.find(j.JSXElement).forEach((path) => {
    const role = getJSXRole(path.value.openingElement.name, state)

    if (role === 'MentionsInput') {
      migrateMentionsInputElement({ api, fileInfo, j, root, state, element: path.value })
    }

    if (role === 'Mention') {
      migrateMentionElement({ api, fileInfo, j, root, state, element: path.value })
    }
  })

  addHelperImports(root, j, state)

  return root.toSource({ quote: 'single', lineTerminator: '\n' })
}

module.exports.parser = 'tsx'
