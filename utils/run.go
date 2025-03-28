package utils

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"os"
	"os/exec"
)

type RunOptions struct {
	Silent bool
	Output io.Writer
}

func Run(ctx context.Context, logger *slog.Logger, opts RunOptions, command string, arg ...string) error {

	if !opts.Silent {
		logger.InfoContext(ctx, "executing", slog.String("command", command), slog.Any("args", arg))
	}

	cmd := exec.Command(command, arg...)
	stdOut := &bytes.Buffer{}
	stdErr := &bytes.Buffer{}
	if opts.Silent {
		cmd.Stdout = stdOut
		cmd.Stderr = stdErr
	} else {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}
	err := cmd.Run()

	if err != nil {
		if opts.Silent {
			logger.ErrorContext(ctx, "execution failed",
				slog.String("error", err.Error()),
				slog.String("stdout", stdOut.String()),
				slog.String("stderr", stdErr.String()))
		} else {
			logger.ErrorContext(ctx, "execution failed", slog.String("error", err.Error()))
		}
		return err
	}
	return nil
}

func RunWD(ctx context.Context,
	logger *slog.Logger,
	opts RunOptions,
	wd string,
	command string,
	hideArgs bool, arg ...string) error {

	if !opts.Silent {
		if hideArgs {
			logger.InfoContext(ctx, "executing in working directory",
				slog.String("wd", wd),
				slog.String("command", command),
				slog.Int("args_count", len(arg)))
		} else {
			logger.InfoContext(ctx, "executing in working directory",
				slog.String("wd", wd),
				slog.String("command", command),
				slog.Any("args", arg))
		}
	}

	cmd := exec.Command(command, arg...)
	cmd.Dir = wd
	stdOut := &bytes.Buffer{}
	stdErr := &bytes.Buffer{}
	if opts.Silent {
		cmd.Stdout = stdOut
		cmd.Stderr = stdErr
	} else {
		if opts.Output != nil {
			cmd.Stdout = opts.Output
			cmd.Stderr = opts.Output
		} else {
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
		}
	}
	err := cmd.Run()

	if err != nil {
		if opts.Silent {
			logger.ErrorContext(ctx, "execution failed",
				slog.String("error", err.Error()),
				slog.String("stdout", stdOut.String()),
				slog.String("stderr", stdErr.String()))
		} else {
			logger.ErrorContext(ctx, "execution failed", slog.String("error", err.Error()))
		}
		return err
	}
	return nil
}
