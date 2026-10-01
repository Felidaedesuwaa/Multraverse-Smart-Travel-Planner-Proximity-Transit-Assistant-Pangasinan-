// Mongoose's exporter supplies BSON types; supplement constraints it does not export.
function jsonSchema(schema) {
  const result = schema.toJSONSchema({ useBsonType: true })
  result.additionalProperties = false
  schema.eachPath((name, field) => {
    let node = result
    for (const part of name.split('.')) node = node.properties[part]
    const options = field.options
    if (field.instance === 'String') {
      if (options.maxlength !== undefined) node.maxLength = options.maxlength
      if (options.minlength !== undefined) node.minLength = options.minlength
      else if (field.isRequired) node.minLength = 1
      if (options.match) node.pattern = options.match.source
    }
    if (field.instance === 'Number') {
      if (options.min !== undefined) node.minimum = options.min
      if (options.max !== undefined) node.maximum = options.max
      if (options.integer) node.multipleOf = 1
    }
    if (field.instance === 'Mixed') node.bsonType = field.isRequired ? 'object' : ['object', 'null']
    if (field.instance === 'Array') {
      node.maxItems = options.maxItems || 500
      const element = field.$embeddedSchemaType
      if (element?.instance === 'String') node.items.maxLength = 2000
      if (element?.options.min !== undefined) node.items.minimum = element.options.min
      if (element?.options.max !== undefined) node.items.maximum = element.options.max
    }
    if (field.schema) {
      if (field.instance === 'Array') node.items = jsonSchema(field.schema)
      else {
        const bsonType = node.bsonType
        Object.assign(node, jsonSchema(field.schema))
        node.bsonType = bsonType
      }
    }
  })
  // Nested coordinate objects have a closed shape and must be complete when present.
  if (result.properties.coordinates?.properties?.lat) {
    result.properties.coordinates.additionalProperties = false
    result.properties.coordinates.required = ['lat', 'lng']
  }
  if (result.properties.geoPoint) {
    const point = result.properties.geoPoint
    point.properties.coordinates.minItems = 2
    point.properties.coordinates.maxItems = 2
    point.properties.coordinates.items = [{ bsonType: 'number', minimum: -180, maximum: 180 }, { bsonType: 'number', minimum: -90, maximum: 90 }]
  }
  if (result.properties.role && result.properties.municipality) result.anyOf = [
    { properties: { role: { enum: ['EXPLORER', 'PRO', 'ADMIN', 'SUPERADMIN'] } } },
    { required: ['municipality'], properties: { municipality: { bsonType: 'string' } } },
  ]
  return result
}
function models() {
  const loaded = { ...require('../dist/models'),
    ...require('../dist/models/AISettings'), ...require('../dist/models/PendingRegistration'),
    ...require('../dist/models/PlannerDraft'), ...require('../dist/models/AuthLimit'),
  }
  const { collectionNames } = require('../dist/models/_collections')
  return Object.entries(collectionNames).map(([name, collection]) => {
    const model = loaded[name]
    if (!model || model.collection.collectionName !== collection) throw new Error(`Collection registry mismatch: ${name}`)
    return model
  })
}
module.exports = { jsonSchema, models }
