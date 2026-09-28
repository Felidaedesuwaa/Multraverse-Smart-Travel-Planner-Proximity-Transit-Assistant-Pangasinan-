const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)

// Exclude only our backend directory. A bare /server\/.*/ also matches
// node_modules/fontfaceobserver/ on Linux and breaks Expo's web font loader.
const serverDirectory = path.resolve(__dirname, 'server').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
config.resolver.blockList = [new RegExp(`^${serverDirectory}[/\\\\]`)]

module.exports = config
