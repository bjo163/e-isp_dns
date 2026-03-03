package auth

import (
"errors"
"os"
"strings"
"time"

"github.com/golang-jwt/jwt/v5"
"github.com/gofiber/fiber/v2"
)

var jwtSecret = func() []byte {
if s := os.Getenv("JWT_SECRET"); s != "" {
return []byte(s)
}
return []byte("trustpositif-secret-change-in-prod")
}()
const tokenTTL = 24 * time.Hour

type Claims struct {
Username string `json:"username"`
jwt.RegisteredClaims
}

func Sign(username string) (string, error) {
claims := Claims{
Username: username,
RegisteredClaims: jwt.RegisteredClaims{
ExpiresAt: jwt.NewNumericDate(time.Now().Add(tokenTTL)),
IssuedAt:  jwt.NewNumericDate(time.Now()),
},
}
return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

func Verify(tokenStr string) (*Claims, error) {
t, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
return nil, errors.New("unexpected signing method")
}
return jwtSecret, nil
})
if err != nil || !t.Valid {
return nil, errors.New("invalid token")
}
claims, ok := t.Claims.(*Claims)
if !ok {
return nil, errors.New("invalid claims")
}
return claims, nil
}

func Middleware() fiber.Handler {
return func(c *fiber.Ctx) error {
header := c.Get("Authorization")
if header == "" {
return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing Authorization header"})
}
parts := strings.SplitN(header, " ", 2)
if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid Authorization format"})
}
claims, err := Verify(parts[1])
if err != nil {
return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
}
c.Locals("username", claims.Username)
return c.Next()
}
}
