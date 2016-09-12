// There was no new data to return
export function NotModified(message) {
   this.message = message;
   this.status = "304";
}

// The request was invalid or cannot otherwise be served
export function BadRequest() {
  this.message = "";
  this.status = "400";
}

export function Unauthorized() {
  this.message = "";
  this.status = "401";
}
