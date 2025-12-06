import { session } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const REACT_DEVELOPER_TOOLS = 'fmkadmapgofadopljbjfkapdkoienihi';
export const REDUX_TOOLS = 'lmhkpmbekcpmknklioeibfkpmmfibljd'; // 설치친는되나, store 인식이 안됨

async function loadSingleExtension(extensionId: string) {
  const basePath = path.join(
    os.homedir(),
    'Library/Application Support/Google/Chrome/Default/Extensions',
    extensionId
  );

  const versions = fs
    .readdirSync(basePath)
    .filter((name) => name.endsWith('_0')) // "5.0.1_0" 같은 폴더만
    .sort(); // 보통 버전 문자열 정렬로 충분

  if (versions.length === 0) {
    throw new Error(`No version folders found in ${basePath}`);
  }

  const latestVersion = versions[versions.length - 1];
  const extensionPath = path.join(basePath, latestVersion);

  console.log('Loading extension from path:', extensionPath);
  await session.defaultSession.extensions.loadExtension(extensionPath, {
    allowFileAccess: true,
  });

  return extensionId;
}

export async function installExtension(extensionIds: string | string[]) {
  const ids = Array.isArray(extensionIds) ? extensionIds : [extensionIds];
  await Promise.all(ids.map(loadSingleExtension));
  await checkExtensionServiceWorker();
}

export async function checkExtensionServiceWorker() {
  const allExtensions = session.defaultSession.extensions.getAllExtensions();

  for (const ext of allExtensions) {
    const { manifest } = ext;
    if (!manifest) continue;
    if (manifest.manifest_version !== 3) continue;
    if (!manifest.background?.service_worker) continue;

    console.log(
      `Extension(${ext.id}) uses service worker:`,
      manifest.background.service_worker
    );

    await session.defaultSession.serviceWorkers.startWorkerForScope(ext.url);
  }
}
