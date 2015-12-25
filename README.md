# pm2-dog-admin

pm2 processes moniter on web

Monit services started by [pm2](https://github.com/Unitech/pm2) from local or remote host

## Usage 

admin: [pm2-dog-admin](https://github.com/Dongss/pm2-dog-admin)

server: [pm2-dog-server](https://github.com/Dongss/pm2-dog-server)

### Install server side on your pm2 processes hosts

Local or remote host:

```
git clone https://github.com/Dongss/pm2-dog-server
cd pm2-dog-server
npm install
node index.js
```

see this:

```
$node index.js 
PM2 connect success
PM2 server listening on port:  10105
```

### Install admin side on your pm2 admin host

Admin host

```
git clone https://github.com/Dongss/pm2-dog-admin
cd pm2-dog-admin
node index.js --config config.json
```

see this:

```
$node index.js --config config.json
PM2-dog admin listening on:  0.0.0.0 10106
```

[config.json expample](https://github.com/Dongss/pm2-dog-admin/blob/master/default_config.json)

```
{
    "admin": {
        "host": "0.0.0.0",
        "port": 10106
    },
    "servers": [{
        "alias": "Local",
        "host": "1.1.1.1",
        "port": 10105,
        "categories": [{
            "pm_name": "pm_name",
            "category": "c_1"
        }, {
            "pm_name": "pm_name_2",
            "category": "c_2"
        }]
    }, {
        "alias": "TestHost",
        "host": "2.2.2.2",
        "port": 10105,
        "categories": [{
            "pm_name": "pm_name_23",
            "category": "c_3"
        }]
    }]
}
```

### Monite on web

Visit url localhost:10106
![demo](./images/desc.png)


