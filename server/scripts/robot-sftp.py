#!/usr/bin/env python3
"""
Robot SFTP - Transfer files to Reachy Mini robot via SFTP

Usage:
    python3 robot-sftp.py <local_file> <remote_path>

Example:
    python3 robot-sftp.py /tmp/audio.mp3 /tmp/reggie-speak.mp3
"""

import sys
import json
import paramiko

# Robot connection details
ROBOT_HOST = "192.168.0.11"
ROBOT_USER = "pollen"
ROBOT_PASSWORD = "root"


def transfer_file(local_path: str, remote_path: str) -> dict:
    """Transfer a file to the robot via SFTP."""
    result = {
        "success": False,
        "local_path": local_path,
        "remote_path": remote_path,
        "error": None
    }

    try:
        # Connect to robot
        transport = paramiko.Transport((ROBOT_HOST, 22))
        transport.connect(username=ROBOT_USER, password=ROBOT_PASSWORD)

        sftp = paramiko.SFTPClient.from_transport(transport)
        sftp.put(local_path, remote_path)
        sftp.close()
        transport.close()

        result["success"] = True

    except paramiko.AuthenticationException:
        result["error"] = "Authentication failed - check username/password"
    except paramiko.SSHException as e:
        result["error"] = f"SSH error: {e}"
    except FileNotFoundError:
        result["error"] = f"Local file not found: {local_path}"
    except Exception as e:
        result["error"] = f"Transfer error: {e}"

    return result


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    local_path = sys.argv[1]
    remote_path = sys.argv[2]

    result = transfer_file(local_path, remote_path)
    print(json.dumps(result))

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
