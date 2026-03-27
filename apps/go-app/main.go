package main

import (
	"fmt"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello from Go!")
}

func main() {
	http.HandleFunc("/", handler)
	fmt.Println("Go server running on 8080")
	http.ListenAndServe(":8080", nil)
}