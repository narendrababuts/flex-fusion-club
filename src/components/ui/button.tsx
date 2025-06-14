import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold ring-offset-background transition-color-bg duration-150 shadow [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-dark",
        fuchsia: "bg-fuchsia text-white hover:bg-fuchsia-dark",
        destructive: "bg-error text-white hover:bg-red-700",
        outline: "border-2 border-primary text-primary bg-white hover:bg-primary hover:text-white",
        secondary: "bg-fuchsia text-white hover:bg-fuchsia-dark",
        ghost: "hover:bg-blue-100 text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 rounded",
        lg: "h-12 px-8 rounded-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  leftIcon?: React.ReactNode
}

// Ensure exactly one child when using Slot (asChild)
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, leftIcon, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const content = (
      <>
        {leftIcon &&
          <span className="mr-2">
            {React.cloneElement(leftIcon as React.ReactElement, { size: 20, color: "#fff" })}
          </span>
        }
        {children}
      </>
    );
    // Re-style for primary variant: always bg-primary, white text, subtle shadow/hover
    return asChild ? (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "shadow-card hover:shadow-card-hover focus:ring-primary")}
        ref={ref}
        {...props}
      >
        <span className="flex items-center justify-center gap-2 w-full h-full">
          {content}
        </span>
      </Comp>
    ) : (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "shadow-card hover:shadow-card-hover focus:ring-primary")}
        ref={ref}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button"
export { Button, buttonVariants }
