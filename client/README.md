# Usage

1. Install http-server, browserify, and watchify globally
   * `npm install -g http-server broswserify watchify`
2. Use watchify to trigger browserify to build on each save
   * `watchify --debug index.js -o bundle.js -v`
3. Serve the files
   * `http-server .`
4. Access from browser at `localhost:8080`
   * You may have to force reload with cmd+shift+R to prevent Chrome from using its cache
