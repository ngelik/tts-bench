export function setBlueBuffBuildDeclaration(profileSource, build) {
  const marker = 'export const BLUE_BUFF_BUILD';
  const markerCount = profileSource.split(marker).length - 1;
  if (markerCount !== 1) {
    throw new Error(`Expected exactly one BLUE_BUFF_BUILD marker; found ${markerCount}`);
  }

  const declarations = [...profileSource.matchAll(/^export const BLUE_BUFF_BUILD = (?:null|Object\.freeze\([\s\S]*?\));$/gm)];
  if (declarations.length !== 1) {
    throw new Error(`Expected exactly one valid BLUE_BUFF_BUILD declaration; found ${declarations.length}`);
  }

  const replacement = `export const BLUE_BUFF_BUILD = Object.freeze(${JSON.stringify(build, null, 2)});`;
  const current = declarations[0][0];
  if (current === replacement) return profileSource;
  if (current !== 'export const BLUE_BUFF_BUILD = null;') {
    throw new Error('Existing non-null BLUE_BUFF_BUILD declaration conflicts with the verified build');
  }
  return profileSource.replace(current, replacement);
}
