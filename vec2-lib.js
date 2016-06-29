//Library.js
/*
       Common vector2 operations
       Ugly as hell but no GC headaches
       Author: Tudor Nita | cgrats.com
       Version: 0.6 

*/
/* vector 2D structure */
function Vec2(x_,y_) {
	if(typeof x_ == 'object' || typeof x_ == 'array') {
		this.x = x_[0] || x_['x'];
		this.y = x_[1] || x_['y'];		
	}
	else {
		this.x = x_;
		this.y = y_;
	}

    this.set = function(v_) {
		this.x = v_[0] || v_['x'];
		this.y = v_[1] || v_['y']; 
    }

    this.clampZero = function() {
		if(Math.abs(this.x) < 0.0001)
		this.x = 0;
		if(Math.abs(this.y) < 0.0001)
		this.y = 0;		
    }

    this.round = function(precision) {
    	this.x = parseFloat(this.x.toFixed(precision));
    	this.y = parseFloat(this.y.toFixed(precision));
    }

    this.getRounded = function(precision) {
    	return new Vec2(parseFloat(this.x.toFixed(precision)), 
    					parseFloat(this.y.toFixed(precision)));
    }

    this.getArray = function() {
        return [this.x, this.y];
    }
}

/* vector math */ 
vMath = new function() {
    /* vector * scalar */
    this.mulS = function(v, value)  { v.x*=value;  v.y*=value;      }
    /* vector * vector */
    this.mulV = function(v1,v2)     { v1.x*= v2.x;v1.y*=v2.y;       }
    /* vector / scalar */
    this.divS = function(v, value)  { v.x/=value; v.y/=value;       }
    /* vector + scalar */
    this.addS = function(v, value)  { v.x+=value; v.y+=value;       }
    /* vector + vector */
    this.addV  = function(v1,v2)    { v1.x+=v2.x; v1.y+=v2.y;       }
    /* vector - scalar */
    this.subS = function(v, value)  { v.x-=value;  v.y-=value;      }
    /* vector - vector */
    this.subV = function(v1, v2)    { v1.x-=v2.x; v1.y-=v2.y;       }
    /*  vector absolute */
    this.abs = function(v)          { Math.abs(v.x); Math.abs(v.y); }
    /* dot product */
    this.dot = function(v1,v2)      { return (v1.x*v2.x+v1.y*v2.y); }
    /* vector length */
    this.length = function(v)       { return Math.sqrt(this.dot(v,v));       }
    /* distance between vectors */
    this.dist = function(v1,v2)     { return (v2.subV(v1)).length();    }
    /* vector length, squared */
    this.lengthSqr = function(v)    { return v.dot(v);                  }
    /* 
        vector linear interpolation 
        interpolate between two vectors.
        value should be in 0.0f - 1.0f space ( just to skip a clamp operation )
    */
    this.lerp = function(targetV2, v1,v2, value) {  
        targetV2.x = v1.x+(v2.x-v1.x)*value;
        targetV2.y = v1.y+(v2.y-v1.y)*value;
    }
    /* normalize a vector */
    this.normalize  = function(v) {
        if(v.x || v.y) {
            var vlen   = this.length(v);
            v.x = v.x/ vlen;
            v.y = v.y/ vlen;
        }
    }
}



