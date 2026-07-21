/**
 * Self-signed identity Siphoria presents to QZ Tray so the "Action Required"
 * dialog shows a verified "Siphoria" certificate (Organization/CN/expiry all
 * populated, signature "Valid") instead of an anonymous/untrusted request.
 *
 * Generated once via:
 *   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes \
 *     -subj "/C=PH/O=Siphoria/OU=Siphoria POS/CN=Siphoria"
 *
 * Being self-signed, QZ Tray still can't chain it to a trusted CA, so the
 * dialog appears once per install — but checking "Remember this decision"
 * then sticks permanently, because it's remembering a real certificate
 * fingerprint instead of an anonymous request.
 */
export const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAZ+D1AyqMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDcyMDA4MzkwMFoXDTQ2MDcyMDA4MzkwMFowgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDA
RFRvB4kQlYsuZ6d0mDVob839KzelfzE+FEOT7Nfwcbg8vo1IFIhD6QsdgLgy47YM
YCnUy0bVM4hsHxVrjMTdIF8IQudb8UhplkdzhKG7oKJXMF6bkHasyI4ETN90LYjL
EovUWl1sJ941e+vzqrhp0df2D/cGFeqrPKgzc5P9TH+0NOV+kSEEKZjEyBNuYbzR
Dn6IFO35ryWZepbwjFO2EL+klxxLmugUjxsAYwC8Ofb53igVjaK7c4UevRonMkFR
TBSsTPx6H9V/WV3DppL6Cuth7Kz4vqZsDhC20Y3Bkg6k8O9GgV73NBCLwdoWXZPz
Ah1x59soz+j/Ax+jETlDAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBSUswJ6MGXUrD9eVMX6BXLI4gk8AzANBgkq
hkiG9w0BAQsFAAOCAQEAYYN05vztqaccC8Yd6AtnkgNEnWqFC/c3adQRNUjG1lfK
pJIgUHOecJxMoqs1FE0a6WsNoMMi4SsI//9ZiEnlQmGiUfqmDpO7MIYSWgAd5d1x
hN2+0g4lWlhXAvdDUq79Humh3mxyM8bjvCYDhea+Sg1Lxy7U57Md9swzH+AVug3+
wrJvztoCJKvLRfPPhcVeIa5EKFLT+xLOKRe9B4gD+EoLvbrHQdAXY1VB1xw5SQ77
2IPPKUjrBLXOYEpjGZ9H7ljBnF3UNHYByJ1mYehR537nK1IF/FPAsI+kGMXR/uhh
PNKmNOAF8m5DjFYjvO9vN5yNT/6u15eU4tV7Y6m+nA==
-----END CERTIFICATE-----`;

/**
 * Matching private key, used only to sign each QZ Tray request in-browser.
 * Embedding it in the bundle means anyone with access to the built JS can
 * extract it — acceptable here since it only proves "this is the Siphoria
 * app", it isn't a secret protecting data (see PrinterService for context).
 */
export const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDARFRvB4kQlYsu
Z6d0mDVob839KzelfzE+FEOT7Nfwcbg8vo1IFIhD6QsdgLgy47YMYCnUy0bVM4hs
HxVrjMTdIF8IQudb8UhplkdzhKG7oKJXMF6bkHasyI4ETN90LYjLEovUWl1sJ941
e+vzqrhp0df2D/cGFeqrPKgzc5P9TH+0NOV+kSEEKZjEyBNuYbzRDn6IFO35ryWZ
epbwjFO2EL+klxxLmugUjxsAYwC8Ofb53igVjaK7c4UevRonMkFRTBSsTPx6H9V/
WV3DppL6Cuth7Kz4vqZsDhC20Y3Bkg6k8O9GgV73NBCLwdoWXZPzAh1x59soz+j/
Ax+jETlDAgMBAAECggEACqge5/KKedVYHA/Zu8AuAaZky/oHwRAOOiskXcAcbfLX
q+JB8XNV5DG4EIAQdZ2iewgfeXB08h9Dmf6VENuCE+GV8t7GdRWoFlYiirgYwM4U
AXIoZEX7FfOdz4Y1Qnq9oMfb4T7K+9Iv4lYGi4B0bUUYy8YxwnAXjDs19XgcBUeN
/PZx1fqYeLv1sMsoFbytzMV72dpbHplSdY6n3SB6LgAGp7jcAFi+QjvAZ3ILTCPK
mf4qOniQVLD8Pins0Bnzi1jaZFooeSKQwRF5unx6J6M0jm9fuGLbJCSDAG/+YbFp
nF3khc+c7sSu2TQ51d2dLj7+TUwAjyu1Th+tChc6WQKBgQD0ZFFxo5AZcwnhTZxS
+GJeIz+wsxOEVqEvs4u3q6GJNLuxKBpJxBuHX0COAO3T/XnIf18hVXequkLTZ1Ii
Gg6lVRAg3Oefta+IyVtp/XZULtJR85zPYcgMaOMMpZnlEhR9IhHmy3cpFI91Xlpp
kKSgitcihNyVJbzbFqqSItUPuQKBgQDJZjLSTBX2zk0JjQdlNBW+Ng0PWZbkTThh
38suo6WHIgAfmBza5rolecpCffa5yaIAVSk1JgHTsS3PMx/qM3559cr/4dJULxmE
hICggsPGRhGT7ImS1S/uVe4Uhtce/+q2a51Aq4RcjJXDUh3BWb/sr7kN3P1UYG9O
wZ8NJbn22wKBgGM/xk+HJEMhk9aaxSxw0Mn4OKpS3080Ozt7B/esTOrCrqKwbZSd
fqyIQ1goCm24F9gT2hdYdUOxZughoppUyLPeCrG95JbYmxPK6kPt+jsP1LwRWhJi
XHKluedt7US5BfcXefunj5nwTp5UlhUe96x3Fg1ftZEghUTYPKciXDKJAoGARMQR
bD6wbTHpme4+bS7IkcbQ1MHpRJCdRMXuEUGtHiPc2OzORWvseSlJh0SNPsh6+RQa
2tvcWdSwaIPzTLtCXxAuvQn1D+t5EgdQB/4+LG/2RoTIQItsLzvF69pSj3IgSSMb
cV5e9l7GMAfUwxUK9BzX2cTv9qRqvQBdd1a/VWsCgYBw4YtMDq2ujd1YG8PcoJmU
XdjIAmLtloO1mKCnwy1Ss9ZBCd4EVzgrSu2m0Ixfm5mjX1d4Z9LbdhOjhU1TaEoj
i664icfTmxURJoO/64tBlswbpLVTmrtEKjXsRr/SpnmzddKgyWblM5Ck166IB1+S
ADg2Dlvo7QuaKuUnW8UyYA==
-----END PRIVATE KEY-----`;
