// There was no new data to return
export function NotModified() {
   this.message = 'Not modified';
   this.status = '304';
}

// The request was invalid or cannot otherwise be served
export function BadRequest() {
  this.message = 'Bad Request';
  this.status = '400';
}

export function Unauthorized() {
  this.message = 'Unauthorized';
  this.status = '401';
}

export function NotFound() {
  this.message = 'Not Found';
  this.status = '404';
}
