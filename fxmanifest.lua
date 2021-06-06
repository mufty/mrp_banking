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
    'ui/main.js',
    'ui/style.css',
    'ui/index.html',
}

client_scripts {
    'client.js',
}

server_scripts {
    'server.js',
}
