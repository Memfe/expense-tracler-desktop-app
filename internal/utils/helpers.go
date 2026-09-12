package utils

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

var Validator = validator.New()

func ValidationMessage(err error) string {
	errors, ok := err.(validator.ValidationErrors)
	if ok {
		e := errors[0]

		switch e.Tag() {
		case "required":
			return fmt.Sprintf("%s field required", e.Field())
		case "min":
			return fmt.Sprintf("%s is too short", e.Field())
		case "max":
			return fmt.Sprintf("%s is too long", e.Field())
		case "gt":
			return fmt.Sprintf("%s should be greater than 0", e.Field())
		case "gte":
			return fmt.Sprintf("%s must be 0 or greater", e.Field())
		}
	}
	return err.Error()
}
