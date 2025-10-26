#!/usr/bin/env node
import {
  build,
  type Configuration,
  createTargets,
  Platform,
} from 'electron-builder';
import { loadConfigFromFile, type PluginOption } from 'vite';
import type { ElectronPackageOptions } from '../vite/vite-plugin';

type ElectronPackagePlugin = {
  name: string;
  _options: ElectronPackageOptions;
};
async function getViteConfig() {
  const res = await loadConfigFromFile({
    mode: 'production',
    command: 'build',
  });
  return res;
}

getViteConfig()
  .then((res) => {
    console.log('✅ Vite 설정 로드 완료');
    const plugins = res?.config.plugins?.flat();
    if (!plugins?.length) {
      throw new Error('Vite 플러그인을 찾을 수 없습니다.');
    }

    const electronPlugin = plugins.find((plugin) => {
      return (
        plugin &&
        typeof plugin === 'object' &&
        (plugin as ElectronPackagePlugin).name === 'vite-plugin-electron'
      );
    }) as ElectronPackagePlugin | undefined;

    if (!electronPlugin) {
      throw new Error('Vite Electron 플러그인을 찾을 수 없습니다.');
    }

    const packageOptions = electronPlugin._options;
    console.log('📦 Package Options:', packageOptions);

    // packageOptions에서 targets 추출하여 Platform 배열로 변환
    const platforms = packageOptions.targets.map((target) => {
      if (target === 'mac') return Platform.MAC;
      if (target === 'win') return Platform.WINDOWS;
      throw new Error(`지원하지 않는 타겟: ${target}`);
    });

    // packageOptions를 사용하여 config 생성
    const config: Configuration = {
      appId: packageOptions.appId,
      // productName: 'Timmy Studio', // package.json의 name 필드 사용
      files: ['dist'],
      extraResources: [
        {
          from: './extra-resources/',
          to: './extra-resources/',
          filter: ['**/*'],
        },
      ],
      icon: packageOptions.icon,
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

    // targets에 따라 빌드 실행
    return build({
      targets: createTargets(platforms),
      config,
    });
  })
  .then(() => {
    console.log('🚀 패키징 완료 🚀');
  })
  .catch((e) => {
    console.error('패키징 중 오류 발생:', e);
    process.exit(1);
  });
