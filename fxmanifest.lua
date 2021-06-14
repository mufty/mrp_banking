fx_version 'cerulean'
game 'gta5'

author 'mufty'
description 'MRP Banking'
version '0.0.1'

ui_page 'ui/index.html'

dependencies {
    "mrp_core"
}

files {
    'ui/fonts/coolvetica_rg.ttf',
    'ui/imgs/fleeca_logo.png',
    'ui/lib/jquery-dateformat.min.js',
    'ui/main.js',
    'ui/style.css',
    'ui/index.html',
    'config/config.json',
}

client_scripts {
    '@mrp_core/shared/debug.js',
    'client.js',
}

server_scripts {
    '@mrp_core/shared/debug.js',
    'server.js',
}
