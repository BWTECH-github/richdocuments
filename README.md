owncloud.online application to integrate Collabora Online
==================================================

Modified by BW-Tech GmbH for owncloud.online and PHP 8.4 compatibility.

Collabora Online for owncloud.online provides collaborating editing functions for text documents, spreadsheets and presentations inside owncloud.online for improved productivity.

See also: https://owncloud.online

### Configuration

- Set WOPI Server URL

    ```
    $ occ config:app:set richdocuments wopi_url --value [your-host-public-ip]:8098 
    ```

- Enable/Disable Secure View and set its settings

    ```
    $ occ config:app:set richdocuments secure_view_option --value true
    $ occ config:app:set richdocuments watermark_text --value "Restricted to {viewer-email}" 
    $ occ config:app:set richdocuments secure_view_open_action_default --value true
    ```

### Developing

The easiest way to integrate Collabora with development instance of owncloud.online is by disabling SSL for Collabora.

- Start Collabora Server with default settings

    ```
    $ docker run -t -d -p 9980:9980 -e "extra_params=--o:ssl.enable=false" -e "username=admin" -e "password=admin" --name collabora --cap-add MKNOD collabora/code:6.4.8.6
    ```

- Access Collabora Admin at `http://[your-host-public-ip]:9980/loleaflet/dist/admin/admin.html` e.g. `172.16.12.95`,

- Set in `Settings -> Admin -> Additional -> Collabora Online server -> http://[your-host-public-ip]:9980`

### Installation

NOTE: Collabora server needs to be reachable from owncloud.online server, and Collabora server needs to be able to reach owncloud.online server

NOTE: it is possible to use Collabora Online’s integration with re-compiled and/or re-branded backends.

## Installing connector for owncloud.online Web

You will need:
* [owncloud.online server](https://owncloud.online) with owncloud.online Web (it can be compiled from source code or installed from the [official marketplace](https://owncloud.online)).
* Official owncloud.online Collabora Online integration app. You can install it from the [owncloud.online marketplace](https://owncloud.online).

To enable work within owncloud.online web, register the connector in the owncloud.online Web config.json:

* If you installed owncloud.online Web from the official marketplace, the path is `<owncloud-root-catalog>/config/config.json`
* If you compiled it from source code yourself using [this instruction](https://owncloud.dev/clients/web/backend-oc10/#running-web), the path is `<owncloud-web-root-catalog>/config/config.json`.

To register the connector, use these lines:

```
"external_apps": [
    {
        "id": "richdocuments",
        "path": "http(s)://<owncloud-10-server-address>/index.php/apps/richdocuments/js/richdocuments.js"
    }
]
```

## Compiling the connector for owncloud.online Web

Build all the dependencies:

```
yarn install
```
Build the resulting file `js/web/richdocuments.js`:

```
yarn build
```
