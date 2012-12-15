## MslCmdr 3
This is a 3D, in-browser version of the classic arcade game [Missile Command](http://en.wikipedia.org/wiki/Missile_Command). It makes heavy use of [three.js](https://github.com/mrdoob/three.js/) and [tween.js](https://github.com/sole/tween.js).

 * * *

### To do
 * prevent explosion chains from destroyed cities
 * add support for cluster missiles
 * build out 4 levels
 * refactor explosions out of missile code
 * consider refactoring for events (MISSILE_ARRIVE, CITY_DESTROYED, etc)


### Done
 * fixed null reference after enemy missiles' random x would be outside of the picking plane
 * fix aspect ratio on horizontal window resize (not fixing)
 * make explosions grow and shrink
 * add point displays over canvas
