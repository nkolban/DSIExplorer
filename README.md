# DSIExplorer

# Installation
The package consists of two files.  The `DSI_REST_Utils.war` which provides server side processing for specialized
REST requests and `DSIExplorer.war` which is the browser hosted application.  The installation for these is as 
follows:

1. Copy `DSIExplorer.war` to the Liberty dropins folder.  This is commonly found at

`<LibertyRoot>/usr/server/<serverName>/dropins`

2. Copy the `DSI_REST_Utils.war` to the app folder which is commonly found at

`<LibertyRoot>/usr/servers/<serverName>/apps`

We must also explicitly define an application entry in `server.xml` for `DSI_REST_Utils.war` which looks like:

```
<webApplication id="DSI_REST_Utils" location="DSI_REST_Utils.war" name="DSI_REST_Utils">
   <classloader apiTypeVisibility="spec,ibm-api,api,third-party">
      <privateLibrary >
         <fileset dir="C:\IBM\ODMInsights88\runtime\ia\lib" includes="com.ibm.ia.engine.engine-runtime_1.30.2.CIS2016-02-01T092131Z.jar"></fileset>
      </privateLibrary>
   </classloader>
</webApplication>
```

You may have to modify the `dir` entry to reflect your own local classpath.