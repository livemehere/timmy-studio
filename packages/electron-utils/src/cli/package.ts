import {
  build,
  type Configuration,
  createTargets,
  Platform,
} from 'electron-builder';

/**TODO: 이거 vite plugin 속성 읽어서 하도록 수정하기 */
const config: Configuration = {
  appId: 'com.livemehere.timmy-desktop',
  // productName: 'Timmy Studio', // package.json의 name 필드 사용
  files: ['dist'],
  extraResources: [
    {
      from: './extra-resources/',
      to: './extra-resources/',
      filter: ['**/*'],
    },
  ],
  icon: './extra-resources/icon.png',
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
