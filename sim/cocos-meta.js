/**
 * Cocos 资源 meta 写入器：供生成管线在编辑器之外产出可导入资产。
 * 用法：仅给「编辑器尚未导入过」的新文件写 meta（缺才写，不覆盖——
 * 编辑器导入过的 meta 含裁切/uuid 信息，覆盖会造成显示跳变）。
 */
'use strict';

/** 图片 sprite-frame meta（未裁切全图，预计算全幅 UV；编辑器下次打开会按内容重新裁切） */
function spriteFrameMeta(name, uuid, w, h, ext = '.png', hasAlpha = false) {
  const tex = `${uuid}@6c48a`;
  const sf = `${uuid}@f9941`;
  return JSON.stringify({
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid,
    files: ['.json', ext],
    subMetas: {
      '6c48a': {
        importer: 'texture',
        uuid: tex,
        displayName: name,
        id: '6c48a',
        name: 'texture',
        userData: {
          wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge',
          minfilter: 'linear', magfilter: 'linear', mipfilter: 'none',
          anisotropy: 0, isUuid: true, imageUuidOrDatabaseUri: uuid, visible: false,
        },
        ver: '1.0.22', imported: true, files: ['.json'], subMetas: {},
      },
      f9941: {
        importer: 'sprite-frame',
        uuid: sf,
        displayName: name,
        id: 'f9941',
        name: 'spriteFrame',
        userData: {
          trimThreshold: 1, rotated: false, offsetX: 0, offsetY: 0,
          trimX: 0, trimY: 0, width: w, height: h, rawWidth: w, rawHeight: h,
          borderTop: 0, borderBottom: 0, borderLeft: 0, borderRight: 0,
          packable: true, pixelsToUnit: 100, pivotX: 0.5, pivotY: 0.5, meshType: 0,
          vertices: {
            rawPosition: [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, -w / 2, h / 2, 0, w / 2, h / 2, 0],
            indexes: [0, 1, 2, 2, 1, 3],
            uv: [0, h, w, h, 0, 0, w, 0],
            nuv: [0, 1, 1, 1, 0, 0, 1, 0],
            minPos: [-w / 2, -h / 2, 0],
            maxPos: [w / 2, h / 2, 0],
          },
          isUuid: true, imageUuidOrDatabaseUri: tex, atlasUuid: '', trimType: 'auto',
        },
        ver: '1.0.12', imported: true, files: ['.json'], subMetas: {},
      },
    },
    userData: {
      type: 'sprite-frame',
      fixAlphaTransparencyArtifacts: false,
      hasAlpha,
      redirect: tex,
    },
  }, null, 2);
}

/** 目录 meta（directory importer） */
function dirMeta(uuid) {
  return JSON.stringify({
    ver: '1.2.0',
    importer: 'directory',
    imported: true,
    uuid,
    files: [],
    subMetas: {},
    userData: {},
  }, null, 2);
}

module.exports = { spriteFrameMeta, dirMeta };
