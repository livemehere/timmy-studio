import {
  build,
  type Configuration,
  createTargets,
  Platform,
} from 'electron-builder';

const config: Configuration = {
  appId: 'com.livemehere.timmy-studio',
  productName: 'Timmy Studio',
  files: ['dist'],
  directories: {
    output: 'release/${version}',
  },
  mac: {
    target: ['dmg'],
    identity: null,
  },
  win: {
    target: ['nsis'],
  },
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
};

build({
  targets: createTargets([Platform.MAC]),
  config,
})
  .then(() => {
    console.log('🚀 패키징 완료 🚀');
  })
  .catch((e) => {
    console.error('패키징 중 오류 발생:', e);
    process.exit(1);
  });
