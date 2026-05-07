import { defineConfig } from '@ownclouders/extension-sdk'

// Modified by BW-Tech GmbH for owncloud.online PHP 8.4 compatibility.
export default defineConfig({
    plugins: [
        {
            name: 'bw-tech-banner',
            generateBundle(_options, bundle) {
                for (const file of Object.values(bundle)) {
                    if (file.type === 'chunk') {
                        file.code = '/* Modified by BW-Tech GmbH for owncloud.online PHP 8.4 compatibility. */\n' + file.code
                    }
                }
            }
        }
    ],
    server: {
        port: 5566
    },
    build: {
        rollupOptions: {
            output: {
                banner: '/* Modified by BW-Tech GmbH for owncloud.online PHP 8.4 compatibility. */',
                dir: "./js/web/",
                entryFileNames: `[name].js`
            }
        }
    }
})
