#!/usr/bin/env node

/**
 * Generate coverage badge SVG locally without network access
 * This script reads the coverage summary and generates a badge SVG
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

const getColour = (coverage) => {
  if (coverage < 80) {
    return 'red'
  }
  if (coverage < 90) {
    return 'yellow'
  }
  return 'brightgreen'
}

const getColorHex = (colour) => {
  const colorMap = {
    brightgreen: '97ca00',
    yellow: 'dfb317',
    red: 'e05d44'
  }
  return colorMap[colour] || colorMap.red
}

const generateBadgeSVG = (coverage, colour) => {
  const coverageText = `${coverage}%`
  // Badge dimensions matching shields.io standard badge sizes
  const labelWidth = 59 // Width for "Coverage" label
  const valueWidth = 40 // Width for percentage value
  const totalWidth = labelWidth + valueWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="Coverage: ${coverageText}">
  <title>Coverage: ${coverageText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#${getColorHex(colour)}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${(labelWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}">Coverage</text>
    <text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 10) * 10}">Coverage</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 10) * 10}">${coverageText}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(valueWidth - 10) * 10}">${coverageText}</text>
  </g>
</svg>`
}

try {
  const reportPath = resolve(
    __dirname,
    '..',
    'coverage',
    'coverage-summary.json'
  )
  const outputPath = resolve(__dirname, '..', 'badges', 'coverage.svg')

  const report = JSON.parse(readFileSync(reportPath, 'utf8'))

  if (!(report && report.total && report.total.statements)) {
    throw new Error('malformed coverage report')
  }

  const coverage = report.total.statements.pct
  const colour = getColour(coverage)
  const svg = generateBadgeSVG(coverage, colour)

  writeFileSync(outputPath, svg, 'utf8')
  console.log(`Wrote coverage badge to: ${outputPath}`)
  console.log(`Coverage: ${coverage}% (${colour})`)
} catch (err) {
  console.error('Error generating coverage badge:', err.message)
  process.exit(1)
}
