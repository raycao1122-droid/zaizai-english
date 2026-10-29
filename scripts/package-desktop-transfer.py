"""Export one Git bundle plus a launcher, avoiding duplicate working-tree bytes."""
import argparse
from pathlib import Path
import subprocess
import tempfile
from zipfile import ZIP_STORED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = 'zaizai-english-transfer'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if subprocess.check_output(['git', '-C', str(ROOT), 'status', '--porcelain']):
        raise SystemExit('Commit or preserve outstanding work before exporting.')
    if args.output.exists():
        raise SystemExit('Output already exists; choose a new filename to preserve it.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    instructions = (
        '在在的英语课堂：电脑本地迁移包\n\n'
        '1. 完整解压此 ZIP；不要直接在压缩包里运行脚本。\n'
        '2. 在 Mac 双击 restore-and-start.command。它会从旁边的 Git 历史包还原完整项目，'
        '然后安装依赖并启动网页。需要本机 Git 和 Node.js 24 LTS。\n'
        '3. 若提示缺少 Node.js，请从 https://nodejs.org/ 安装，之后进入还原出的 '
        'zaizai-english 文件夹，运行 start-local.command。\n'
        '4. 在 Codex 电脑端把还原出的 zaizai-english 文件夹打开为本地项目，'
        '之后一直在同一文件夹继续。完整说明在 LOCAL_DEVELOPMENT.md。\n\n'
        '包内包含原始设计素材、现有代码、完整 Git 历史、截图和视频，'
        '不包含平台相关 node_modules；依赖会按锁文件在电脑安装。\n'
        '公网演示：https://raycao1122-droid.github.io/zaizai-english/ 。本机运行不依赖云端环境。当前为 M2 模拟课堂，真实 AI、语音和后端尚未接入。\n'
    )
    with tempfile.TemporaryDirectory(prefix='zaizai-transfer-') as tmp:
        bundle = Path(tmp) / 'zaizai-english-history.bundle'
        subprocess.run(['git', '-C', str(ROOT), 'bundle', 'create', str(bundle), '--all'], check=True)
        subprocess.run(['git', '-C', str(ROOT), 'bundle', 'verify', str(bundle)], check=True)
        with ZipFile(args.output, 'x', compression=ZIP_STORED) as archive:
            for name, data, mode in [
                ('zaizai-english-history.bundle', bundle.read_bytes(), 0o644),
                ('restore-and-start.command', (ROOT / 'scripts/restore-transfer.command').read_bytes(), 0o755),
                ('README.txt', instructions.encode(), 0o644),
            ]:
                entry = ZipInfo(f'{PACKAGE}/{name}')
                entry.create_system = 3
                entry.external_attr = (0o100000 | mode) << 16
                archive.writestr(entry, data)
        with ZipFile(args.output) as archive:
            if archive.testzip() is not None:
                raise SystemExit('Archive integrity check failed.')
    args.output.chmod(0o644)
    print(f'Saved {args.output}: {args.output.stat().st_size / 1024**2:.1f} MiB')


if __name__ == '__main__':
    main()
